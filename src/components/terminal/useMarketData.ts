"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Candle } from "./types";
import { TF_MAP, HTF_MAP, HTF_SAXO_TF } from "./constants";
import { API_CONFIG, TRADING_CONFIG, UPDATE_INTERVALS, INSTRUMENTS, DEFAULT_INSTRUMENT_ID, INDICATOR_CONFIG } from "./config";
import type { Instrument } from "./config";
import { computeHtfTrendFromCloses } from "./indicators";
import { getUIC } from "../../lib/saxo-uic-cache";
import { getAccessToken } from "../../lib/saxo-auth";
import { connectSaxoStream as connectSaxoStreamExternal } from "./connectSaxoStream";

// VERSION CHECK - If you see this in browser console, code is loaded correctly
console.log("🔄 [useMarketData] Version: 2024-DYNAMIC-UIC-v2 loaded");

// ─── Types ────────────────────────────────────────────────────────────────────
interface MarketDataState {
  candles: Candle[];
  currentPrice: number;
  priceChange: number;
  high24h: number;
  low24h: number;
  vol24h: string;
  htfTrend: "bullish" | "bearish" | "neutral";
  connected: boolean;
  isLoading: boolean;
  error: string | null;
}

interface BinanceKline {
  k: {
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
  };
}

interface Binance24hTicker {
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
}

/** Transform raw Saxo chart API payload → Candle[] */
function transformSaxoChartData(data: { Data?: Record<string, unknown>[] }): Candle[] {
  return (data.Data || []).map((item: Record<string, unknown>) => {
    const openBid  = typeof item.OpenBid  === "number" ? item.OpenBid  : undefined;
    const openAsk  = typeof item.OpenAsk  === "number" ? item.OpenAsk  : undefined;
    const highBid  = typeof item.HighBid  === "number" ? item.HighBid  : undefined;
    const highAsk  = typeof item.HighAsk  === "number" ? item.HighAsk  : undefined;
    const lowBid   = typeof item.LowBid   === "number" ? item.LowBid   : undefined;
    const lowAsk   = typeof item.LowAsk   === "number" ? item.LowAsk   : undefined;
    const closeBid = typeof item.CloseBid === "number" ? item.CloseBid : undefined;
    const closeAsk = typeof item.CloseAsk === "number" ? item.CloseAsk : undefined;

    const openFallback  = typeof item.Open  === "number" ? item.Open  : 0;
    const highFallback  = typeof item.High  === "number" ? item.High  : 0;
    const lowFallback   = typeof item.Low   === "number" ? item.Low   : 0;
    const closeFallback = typeof item.Close === "number" ? item.Close : 0;

    const open  = openBid  !== undefined && openAsk  !== undefined ? (openBid  + openAsk)  / 2 : openFallback;
    const high  = highBid  !== undefined && highAsk  !== undefined ? (highBid  + highAsk)  / 2 : highFallback;
    const low   = lowBid   !== undefined && lowAsk   !== undefined ? (lowBid   + lowAsk)   / 2 : lowFallback;
    const close = closeBid !== undefined && closeAsk !== undefined ? (closeBid + closeAsk) / 2 : closeFallback;

    return {
      time:   new Date(item.Time as string).getTime(),
      open, high, low, close,
      volume: 0,
    };
  }).filter((candle: Candle) =>
    !isNaN(candle.open) && !isNaN(candle.high) && !isNaN(candle.low) && !isNaN(candle.close) &&
    candle.open > 0 && candle.high > 0 && candle.low > 0 && candle.close > 0
  );
}

export function useMarketData(instrumentId: string = DEFAULT_INSTRUMENT_ID) {
  // ─── Get current instrument ───────────────────────────────────────────────
  const instrument = INSTRUMENTS[instrumentId] || INSTRUMENTS[DEFAULT_INSTRUMENT_ID];
  const symbol = instrument.broker === "BINANCE" 
    ? (instrument.binanceSymbol || instrument.symbol)
    : instrument.symbol;

  // ─── State (FIX: Batch state updates) ───────────────────────────────────────
  const [state, setState] = useState<MarketDataState>({
    candles: [],
    currentPrice: 0,
    priceChange: 0,
    high24h: 0,
    low24h: 0,
    vol24h: "",
    htfTrend: "neutral",
    connected: false,
    isLoading: true,
    error: null,
  });
  
  const [selectedTf, setSelectedTf] = useState("15m");
  
  // ─── Refs ─────────────────────────────────────────────────────────────────────
  const prevPriceRef     = useRef(0);
  const wsRef            = useRef<WebSocket | null>(null);
  const wsClosingRef     = useRef(false);
  const reconnectTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tfRef            = useRef(selectedTf);
  const mountedRef       = useRef(true);
  const symbolRef        = useRef(symbol);

  useEffect(() => { tfRef.current = selectedTf; }, [selectedTf]);
  useEffect(() => { symbolRef.current = symbol; }, [symbol]);

  // ── REST: historical candles (FIX: Better error handling) ────────────────────
  const fetchCandles = async (tf: string, sym: string = symbolRef.current) => {
    // Only works for Binance instruments
    if (instrument.broker !== "BINANCE") {
      console.warn(`Skipping candle fetch for ${instrument.broker} instrument`);
      return;
    }

    try {
      const { apiInterval } = TF_MAP[tf];
      const url = `${API_CONFIG.REST_API}/klines?symbol=${sym}&interval=${apiInterval}&limit=${TRADING_CONFIG.MAX_CANDLES_BUFFER}`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      
      if (!Array.isArray(data)) {
        throw new Error("Invalid response format");
      }
      
      const parsed: Candle[] = data.map((k: number[]) => ({
        time:   k[0],
        open:   parseFloat(String(k[1])),
        high:   parseFloat(String(k[2])),
        low:    parseFloat(String(k[3])),
        close:  parseFloat(String(k[4])),
        volume: parseFloat(String(k[5])),
      }));
      
      if (!mountedRef.current) return;
      
      // FIX: Batch state update
      setState(prev => ({
        ...prev,
        candles: parsed,
        currentPrice: parsed.length > 0 ? parsed[parsed.length - 1].close : prev.currentPrice,
        isLoading: false,
        error: null,
      }));
      
      if (parsed.length > 0) {
        prevPriceRef.current = parsed[parsed.length - 1].close;
      }
    } catch (e) {
      console.error("Failed to fetch candles:", e);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: e instanceof Error ? e.message : "Failed to fetch candles",
        }));
      }
    }
  };

  // ── REST: 24h ticker (FIX: Better error handling & typing) ───────────────────
  const fetch24hTicker = async (sym: string = symbolRef.current) => {
    // Only works for Binance instruments
    if (instrument.broker !== "BINANCE") {
      return;
    }

    try {
      const url = `${API_CONFIG.REST_API}/ticker/24hr?symbol=${sym}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Ticker API error: ${res.status}`);
      }
      
      const data = await res.json() as Binance24hTicker;
      
      if (!data.priceChangePercent) {
        throw new Error("Invalid ticker data");
      }
      
      if (!mountedRef.current) return;
      
      // FIX: Batch state update
      setState(prev => ({
        ...prev,
        priceChange: parseFloat(data.priceChangePercent),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        vol24h: parseFloat(data.volume).toFixed(0),
      }));
    } catch (e) {
      console.error("Failed to fetch ticker:", e);
      // Don't show error for ticker - not critical
    }
  };

  // ── Saxo chart fetch (shared: main TF + HTF trend) ───────────────────────────
  const fetchSaxoChartCandles = async (
    tf: string,
    instr: Instrument,
    count: number = TRADING_CONFIG.MAX_CANDLES_BUFFER,
  ): Promise<Candle[]> => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error(
        "Market data tidak tersedia. Admin perlu setup token Saxo sekali di server."
      );
    }

    let uic: number | undefined;
    let resolvedAssetType: string | undefined;

    if (instr.searchKeywords && instr.assetType) {
      try {
        const dynamicResult = await getUIC(
          instr.id, instr.searchKeywords, instr.assetType, accessToken,
        );
        if (dynamicResult) {
          uic = dynamicResult.uic;
          resolvedAssetType = dynamicResult.assetType;
        } else {
          uic = instr.uic;
          resolvedAssetType = instr.assetType;
        }
      } catch {
        uic = instr.uic;
        resolvedAssetType = instr.assetType;
      }
    } else if (instr.uic) {
      uic = instr.uic;
      resolvedAssetType = instr.assetType;
    }

    if (!uic || !resolvedAssetType) {
      throw new Error(`UIC not found for ${instr.symbol}`);
    }

    const accountsResponse = await fetch("/api/saxo/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    if (!accountsResponse.ok) {
      throw new Error("Failed to get Saxo account information");
    }
    const accountsData = await accountsResponse.json();
    if (!accountsData.Data?.length) {
      throw new Error("No Saxo accounts found");
    }
    const accountKey = accountsData.Data[0].AccountKey as string;

    const { SAXO_HORIZONS } = await import("./adapters/saxoAdapter");
    const horizon = SAXO_HORIZONS[tf] || 15;

    const response = await fetch("/api/saxo/chart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken,
        accountKey,
        uic,
        assetType: resolvedAssetType,
        horizon,
        count,
        mode: "UpTo",
        time: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || `Chart API error: ${response.status}`);
    }

    const data = await response.json();
    const candles = transformSaxoChartData(data);
    if (candles.length === 0) {
      throw new Error("No valid Saxo chart data received");
    }
    return candles;
  };

  // ── REST: Higher Timeframe trend (Binance + Saxo) ───────────────────────────
  const fetchHTFTrend = async (tf: string, sym: string = symbolRef.current) => {
    try {
      let trend: "bullish" | "bearish" | "neutral" = "neutral";

      if (instrument.broker === "BINANCE") {
        const htfInterval = HTF_MAP[tf] || "4h";
        const url = `${API_CONFIG.REST_API}/klines?symbol=${sym}&interval=${htfInterval}&limit=${INDICATOR_CONFIG.EMA_LONG}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTF API error: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length < INDICATOR_CONFIG.EMA_LONG) {
          console.warn("[HTF] Insufficient Binance HTF data");
          return;
        }
        const closes = data.map((k: number[]) => parseFloat(String(k[4])));
        trend = computeHtfTrendFromCloses(closes);
      } else if (instrument.broker === "SAXO") {
        const htfTf = HTF_SAXO_TF[tf] || "4H";
        const candles = await fetchSaxoChartCandles(htfTf, instrument, INDICATOR_CONFIG.EMA_LONG);
        trend = computeHtfTrendFromCloses(candles.map(c => c.close));
        console.log(`[Saxo HTF] ${htfTf} trend → ${trend}`);
      }

      if (mountedRef.current) {
        setState(prev => ({ ...prev, htfTrend: trend }));
      }
    } catch (e) {
      console.error("Failed to fetch HTF:", e);
    }
  };

  // ── Tutup WS dengan aman — cegah onerror palsu saat cleanup / ganti instrument ──
  const disconnectWS = (reason = "disconnect") => {
    wsClosingRef.current = true;
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    const ws = wsRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close(1000, reason);
      } catch {
        /* already closed */
      }
      wsRef.current = null;
    }
    queueMicrotask(() => {
      wsClosingRef.current = false;
    });
  };

  // ── WebSocket: live kline stream (FIX: Better error handling & typing) ───────
  const connectWS = (tf: string, sym: string = symbolRef.current) => {
    // Only works for Binance instruments
    if (instrument.broker !== "BINANCE") {
      console.log(`WebSocket not available for ${instrument.broker} instrument`);
      return;
    }

    disconnectWS("reconnect");

    const { wsInterval } = TF_MAP[tf];
    const wsUrl = `${API_CONFIG.WS_API}/${sym.toLowerCase()}@kline_${wsInterval}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[WS] Connected to ${wsInterval}`);
      if (mountedRef.current) {
        setState(prev => ({ ...prev, connected: true, error: null }));
      }
    };
    
    ws.onerror = () => {
      // ErrorEvent WebSocket selalu tampil sebagai {} di console — bukan bug data.
      // Abaikan jika kita yang menutup koneksi (unmount, ganti TF, Suspense remount).
      if (wsClosingRef.current || wsRef.current !== ws) return;
      console.warn(`[WS] Connection issue for ${sym}@${wsInterval}, waiting for reconnect...`);
    };
    
    ws.onclose = (event) => {
      if (wsRef.current === ws) wsRef.current = null;
      if (wsClosingRef.current) return;

      console.log("[WS] Disconnected", event.code);
      if (mountedRef.current) {
        setState(prev => ({ ...prev, connected: false }));
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current && instrument.broker === "BINANCE") {
            console.log("[WS] Reconnecting...");
            connectWS(tfRef.current, symbolRef.current);
          }
        }, API_CONFIG.RECONNECT_DELAY_MS);
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as BinanceKline;
        
        if (!msg.k) {
          console.warn("[WS] Invalid message format");
          return;
        }
        
        const k = msg.k;
        const liveCandle: Candle = {
          time:   k.t,
          open:   parseFloat(k.o),
          high:   parseFloat(k.h),
          low:    parseFloat(k.l),
          close:  parseFloat(k.c),
          volume: parseFloat(k.v),
        };

        // FIX: Update prevPrice before setting new price
        prevPriceRef.current = state.currentPrice;

        // FIX: Batch state update untuk candles dan price
        setState(prev => {
          const updatedCandles = prev.candles.length === 0 
            ? [liveCandle]
            : (() => {
                const updated = [...prev.candles];
                const last = updated[updated.length - 1];
                if (last.time === liveCandle.time) {
                  updated[updated.length - 1] = liveCandle;
                } else {
                  updated.push(liveCandle);
                  if (updated.length > TRADING_CONFIG.MAX_CANDLES_BUFFER) {
                    updated.shift();
                  }
                }
                return updated;
              })();

          return {
            ...prev,
            candles: updatedCandles,
            currentPrice: liveCandle.close,
          };
        });
      } catch (e) {
        console.error("[WS] Parse error:", e);
      }
    };
  };

  // ── Lifecycle (FIX: Async data fetching pattern) ─────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    symbolRef.current = symbol;
    
    console.log("[useMarketData] Initializing for instrument:", instrument.symbol, "broker:", instrument.broker);

    // ✅ FIX: deklarasi di scope terluar effect (bukan di dalam initialize/async function)
    // supaya bisa di-clear oleh SATU cleanup yang sama. Bug lama: cleanup untuk interval ini
    // ada di dalam `initialize()` (async function) — return value-nya tidak pernah dipakai
    // React sebagai cleanup, jadi interval BOCOR setiap kali instrument diganti / unmount.
    // Lama-lama menumpuk banyak interval polling /api/saxo/price bersamaan untuk instrument
    // berbeda-beda (kelihatan di console sebagai log yang ke-grouping 2x oleh Chrome).
    let saxoPriceInterval: ReturnType<typeof setInterval> | null = null;

    // FIX: Async initialization - tidak langsung setState di effect body
    const initialize = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Check if broker is Saxo
      if (instrument.broker === "SAXO") {
        console.log(`[Saxo] Loading data for ${instrument.displayName} (${instrument.symbol})`);
        
        try {
          await Promise.all([
            fetchSaxoCandles(selectedTf, instrument),
            fetchSaxoPriceInfo(instrument),
            fetchHTFTrend(selectedTf),
          ]);
          
          // Connect to real-time stream
          // Token validation sudah di-handle dalam connectSaxoStream
          if (mountedRef.current) {
            await connectSaxoStream();
          }
        } catch (error) {
          console.error("[Saxo] Failed to fetch data:", error);
          
          if (mountedRef.current) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: error instanceof Error 
                ? error.message 
                : "Saxo data unavailable. Please login with Saxo account.",
              candles: [],
            }));
          }
        }
        
        // Setup price info refresh for Saxo
        // ✅ FIX: assign ke variabel scope-luar (bukan `const` lokal) supaya bisa di-clear
        saxoPriceInterval = setInterval(() => {
          if (mountedRef.current) {
            fetchSaxoPriceInfo(instrument);
          }
        }, UPDATE_INTERVALS.TICKER_24H_MS);

        // ✅ FIX: tidak ada lagi `return () => {...}` di sini — cleanup dari async function
        // diabaikan React (dead code), itu sebabnya interval di atas dulu selalu bocor.
        // Cleanup sekarang ditangani SATU kali oleh return di akhir effect (di bawah).
        return;
      }
      
      // Binance flow (original)
      console.log(`[Binance] Loading data for ${instrument.displayName} (${instrument.symbol})`);
      
      await Promise.all([
        fetchCandles(selectedTf, symbol),
        fetch24hTicker(symbol),
        fetchHTFTrend(selectedTf, symbol),
      ]);
      
      // Connect WS after initial data loaded
      if (mountedRef.current) {
        connectWS(selectedTf, symbol);
      }
    };
    
    initialize();

    // Refresh intervals per broker
    let tickerInterval: ReturnType<typeof setInterval> | null = null;
    let htfInterval: ReturnType<typeof setInterval> | null = null;

    if (instrument.broker === "BINANCE") {
      tickerInterval = setInterval(() => fetch24hTicker(symbolRef.current), UPDATE_INTERVALS.TICKER_24H_MS);
    }
    htfInterval = setInterval(() => {
      if (instrument.broker === "BINANCE") {
        fetchHTFTrend(tfRef.current, symbolRef.current);
      } else {
        fetchHTFTrend(tfRef.current);
      }
    }, UPDATE_INTERVALS.HTF_TREND_MS);

    // ✅ FIX: recovery saat tab kembali aktif setelah lama di background. WebSocket
    // bisa jadi "zombie" (readyState masih OPEN tapi koneksi TCP sebenarnya sudah mati —
    // umum terjadi setelah laptop sleep, ganti network, atau NAT timeout) TANPA onclose
    // browser pernah terpanggil. Tanpa pengecekan aktif ini, satu-satunya cara recover
    // adalah refresh manual halaman.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" || !mountedRef.current) return;

      console.log("[useMarketData] Tab aktif kembali, verifikasi koneksi...");

      if (instrument.broker === "SAXO") {
        const wsHealthy = wsRef.current?.readyState === WebSocket.OPEN;
        if (!wsHealthy) {
          console.warn("[useMarketData] WS Saxo tidak sehat saat tab aktif kembali, reconnecting...");
          disconnectWS("visibility-recover");
          connectSaxoStream();
        }
        // Refetch candles untuk isi gap data selama tab tidak aktif
        fetchSaxoCandles(tfRef.current, instrument).catch(err =>
          console.error("[useMarketData] Gagal refetch candles setelah tab aktif:", err)
        );
      } else if (instrument.broker === "BINANCE") {
        const wsHealthy = wsRef.current?.readyState === WebSocket.OPEN;
        if (!wsHealthy) {
          console.warn("[useMarketData] WS Binance tidak sehat saat tab aktif kembali, reconnecting...");
          connectWS(tfRef.current, symbolRef.current);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (saxoPriceInterval) clearInterval(saxoPriceInterval);
      if (tickerInterval) clearInterval(tickerInterval);
      if (htfInterval) clearInterval(htfInterval);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      disconnectWS("unmount");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]); // Re-initialize when symbol changes

  // ── Saxo Data Fetching ────────────────────────────────────────────────────────
  const fetchSaxoCandles = async (tf: string, instr: typeof instrument) => {
    console.log(`[Saxo] Fetching candles for ${instr.symbol} (tf: ${tf})`);
    try {
      const candles = await fetchSaxoChartCandles(tf, instr, TRADING_CONFIG.MAX_CANDLES_BUFFER);
      console.log(`[Saxo] Received ${candles.length} valid candles`);

      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        candles,
        currentPrice: candles[candles.length - 1].close,
        isLoading: false,
        error: null,
      }));
      prevPriceRef.current = candles[candles.length - 1].close;
    } catch (error) {
      console.error("[Saxo] Candles fetch failed:", error);
      throw error;
    }
  };

  const fetchSaxoPriceInfo = async (instr: typeof instrument) => {
    // Ambil access token — user atau guest
    const accessToken = await getAccessToken();
    if (!accessToken) return; // skip silently

    let uic: number | undefined;
    let resolvedAssetType: string | undefined;
    if (instr.searchKeywords && instr.assetType) {
      try {
        const dynamicResult = await getUIC(instr.id, instr.searchKeywords, instr.assetType, accessToken);
        if (dynamicResult) {
          uic = dynamicResult.uic;
          resolvedAssetType = dynamicResult.assetType;
        } else {
          uic = instr.uic;
          resolvedAssetType = instr.assetType;
        }
      } catch {
        uic = instr.uic;
        resolvedAssetType = instr.assetType;
      }
    } else {
      uic = instr.uic;
      resolvedAssetType = instr.assetType;
    }

    if (!uic || !resolvedAssetType) return;

    try {
      // Call our server-side API route
      const response = await fetch("/api/saxo/price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: accessToken,
          uic: uic,
          assetType: resolvedAssetType, // assetType NYATA dari Saxo
        }),
      });

      if (!response.ok) {
        console.error("Failed to fetch price info:", response.status);
        return;
      }

      const data = await response.json();

      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        currentPrice: data.Quote?.Mid || prev.currentPrice,
        high24h: data.PriceInfo?.High || 0,
        low24h: data.PriceInfo?.Low || 0,
        // Note: Saxo doesn't provide 24h volume for FX
        vol24h: "-",
      }));
    } catch (error) {
      console.error("Saxo price info fetch failed:", error);
    }
  };

  const connectSaxoStream = async () => {
    // Gunakan implementasi eksternal yang benar (binary WebSocket dengan token di URL)
    await connectSaxoStreamExternal({
      instrument,
      selectedTf,
      tfRef,
      mountedRef,
      wsRef,
      reconnectTimer,
      setState,
      prevPriceRef,
    });
  };

  // ── Public API ────────────────────────────────────────────────────────────
  const switchTimeframe = async (tf: string) => {
    setSelectedTf(tf);
    tfRef.current = tf; // ✅ Update ref langsung — connectSaxoStream baca ini untuk horizon
    setState(prev => ({ ...prev, isLoading: true }));
    
    if (instrument.broker === "SAXO") {
      try {
        await Promise.all([
          fetchSaxoCandles(tf, instrument),
          fetchHTFTrend(tf),
        ]);
        disconnectWS("TF switch");
        if (mountedRef.current) {
          await connectSaxoStream();
        }
      } catch (error) {
        console.error("Failed to switch Saxo timeframe:", error);
      }
    } else {
      // Binance: fetch candles and HTF trend
      await Promise.all([
        fetchCandles(tf, symbolRef.current),
        fetchHTFTrend(tf, symbolRef.current),
      ]);
      
      connectWS(tf, symbolRef.current);
    }
  };

  // FIX: Compute priceUp using useMemo instead of accessing ref during render
  const priceUp = useMemo(() => {
    return state.currentPrice >= prevPriceRef.current;
  }, [state.currentPrice]);

  return {
    candles: state.candles,
    currentPrice: state.currentPrice,
    priceChange: state.priceChange,
    high24h: state.high24h,
    low24h: state.low24h,
    vol24h: state.vol24h,
    selectedTf,
    htfTrend: state.htfTrend,
    connected: state.connected,
    isLoading: state.isLoading,
    error: state.error,
    priceUp,
    switchTimeframe,
    instrument, // Expose current instrument
  };
}
