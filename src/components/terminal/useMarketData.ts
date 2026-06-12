"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Candle } from "./types";
import { TF_MAP, HTF_MAP } from "./constants";
import { API_CONFIG, TRADING_CONFIG, UPDATE_INTERVALS, INSTRUMENTS, DEFAULT_INSTRUMENT_ID } from "./config";
import { calcEMA } from "./indicators";
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

  // ── REST: Higher Timeframe trend (FIX: Better error handling) ────────────────
  const fetchHTFTrend = async (tf: string, sym: string = symbolRef.current) => {
    // Only works for Binance instruments
    if (instrument.broker !== "BINANCE") {
      return;
    }

    try {
      const htfInterval = HTF_MAP[tf] || "4h";
      const url = `${API_CONFIG.REST_API}/klines?symbol=${sym}&interval=${htfInterval}&limit=30`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`HTF API error: ${res.status}`);
      }
      
      const data = await res.json();
      
      if (!Array.isArray(data) || data.length < 21) {
        console.warn("Insufficient HTF data");
        return;
      }
      
      const closes = data.map((k: number[]) => parseFloat(String(k[4])));
      const ema9   = calcEMA(closes, 9);
      const ema21  = calcEMA(closes, 21);
      const last   = closes.length - 1;
      
      let trend: "bullish" | "bearish" | "neutral" = "neutral";
      if      (ema9[last] > ema21[last] && closes[last] > ema9[last]) trend = "bullish";
      else if (ema9[last] < ema21[last] && closes[last] < ema9[last]) trend = "bearish";
      
      if (mountedRef.current) {
        setState(prev => ({ ...prev, htfTrend: trend }));
      }
    } catch (e) {
      console.error("Failed to fetch HTF:", e);
      // Don't show error - not critical
    }
  };

  // ── WebSocket: live kline stream (FIX: Better error handling & typing) ───────
  const connectWS = (tf: string, sym: string = symbolRef.current) => {
    // Only works for Binance instruments
    if (instrument.broker !== "BINANCE") {
      console.log(`WebSocket not available for ${instrument.broker} instrument`);
      return;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent stale reconnect
      wsRef.current.close();
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

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
    
    ws.onerror = (err) => {
      console.error("[WS] Error:", err);
      ws.close();
    };
    
    ws.onclose = () => {
      console.log("[WS] Disconnected");
      if (mountedRef.current) {
        setState(prev => ({ ...prev, connected: false }));
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) {
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
    
    // FIX: Async initialization - tidak langsung setState di effect body
    const initialize = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Check if broker is Saxo
      if (instrument.broker === "SAXO") {
        console.log(`[Saxo] Loading data for ${instrument.displayName} (${instrument.symbol})`);
        
        try {
          // Fetch historical candles
          await fetchSaxoCandles(selectedTf, instrument);
          
          // Fetch current price info (24h high/low)
          await fetchSaxoPriceInfo(instrument);
          
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
        const saxoPriceInterval = setInterval(() => {
          if (mountedRef.current) {
            fetchSaxoPriceInfo(instrument);
          }
        }, UPDATE_INTERVALS.TICKER_24H_MS);

        return () => {
          mountedRef.current = false;
          clearInterval(saxoPriceInterval);
          if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
          
          // Cleanup WebSocket for Saxo
          if (wsRef.current) {
            wsRef.current.onclose = null;
            wsRef.current.close();
          }
        };
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

    // Binance intervals (only for Binance instruments)
    let tickerInterval: ReturnType<typeof setInterval> | null = null;
    let htfInterval: ReturnType<typeof setInterval> | null = null;

    if (instrument.broker === "BINANCE") {
      tickerInterval = setInterval(() => fetch24hTicker(symbolRef.current), UPDATE_INTERVALS.TICKER_24H_MS);
      htfInterval = setInterval(() => fetchHTFTrend(tfRef.current, symbolRef.current), UPDATE_INTERVALS.HTF_TREND_MS);
    }

    return () => {
      mountedRef.current = false;
      if (tickerInterval) clearInterval(tickerInterval);
      if (htfInterval) clearInterval(htfInterval);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]); // Re-initialize when symbol changes

  // ── Saxo Data Fetching ────────────────────────────────────────────────────────
  const fetchSaxoCandles = async (tf: string, instr: typeof instrument) => {
    // Ambil access token — user token (kalau sudah login) atau guest/demo token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error(
        "Market data tidak tersedia. " +
        "Tambahkan SAXO_DEMO_REFRESH_TOKEN di .env.local untuk akses publik, " +
        "atau login dengan akun Saxo."
      );
    }

    // DYNAMIC UIC LOOKUP: selalu coba dynamic (cache/API) dulu, hardcoded hanya fallback terakhir
    console.log(`[Saxo] Starting UIC resolution for ${instr.symbol}`, {
      hasHardcodedUIC: !!instr.uic,
      hardcodedUIC: instr.uic,
      hasSearchKeywords: !!instr.searchKeywords,
      searchKeywords: instr.searchKeywords,
      assetType: instr.assetType,
    });

    let uic: number | undefined;
    let resolvedAssetType: string | undefined;

    if (instr.searchKeywords && instr.assetType) {
      console.log(`[Saxo] 🔍 Resolving UIC dynamically for ${instr.symbol}...`);
      try {
        const dynamicResult = await getUIC(
          instr.id,
          instr.searchKeywords,
          instr.assetType,
          accessToken
        );
        if (dynamicResult) {
          uic = dynamicResult.uic;
          resolvedAssetType = dynamicResult.assetType; // ✅ assetType NYATA dari Saxo
          console.log(`[Saxo] ✅ Dynamic UIC resolved for ${instr.symbol}: UIC=${uic}, AssetType=${resolvedAssetType}`);
        } else {
          console.warn(`[Saxo] ⚠️ Dynamic UIC lookup failed for ${instr.symbol}, falling back to hardcoded...`);
          uic = instr.uic;
          resolvedAssetType = instr.assetType;
          if (uic) console.log(`[Saxo] ↩️ Using hardcoded fallback UIC for ${instr.symbol}: ${uic}`);
        }
      } catch (error) {
        console.error(`[Saxo] ❌ Error during dynamic UIC lookup:`, error);
        uic = instr.uic;
        resolvedAssetType = instr.assetType;
        if (uic) console.log(`[Saxo] ↩️ Using hardcoded fallback UIC for ${instr.symbol}: ${uic}`);
      }
    } else if (instr.uic) {
      uic = instr.uic;
      resolvedAssetType = instr.assetType;
      console.log(`[Saxo] ✅ Using hardcoded UIC for ${instr.symbol} (no searchKeywords): ${uic}`);
    } else {
      console.error(`[Saxo] ❌ No UIC and no searchKeywords! Config:`, instr);
    }
    
    if (!uic) {
      throw new Error(`UIC not found for ${instr.symbol}. Please check: 1) Login with Saxo, 2) Instrument config has searchKeywords, 3) Browser cache cleared.`);
    }

    if (!resolvedAssetType) {
      throw new Error(`Invalid Saxo instrument configuration for ${instr.symbol}: no assetType resolved`);
    }

    console.log(`[Saxo] 🚀 Fetching candles for ${instr.symbol} (UIC: ${uic}, tf: ${tf})`);

    // Step 1: Get AccountKey from Saxo
    let accountKey: string;
    try {
      const accountsResponse = await fetch("/api/saxo/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: accessToken,
        }),
      });

      if (!accountsResponse.ok) {
        const error = await accountsResponse.json();
        console.error("[Saxo] Accounts API error:", error);
        throw new Error("Failed to get account information. Please login again.");
      }

      const accountsData = await accountsResponse.json();
      
      if (!accountsData.Data || accountsData.Data.length === 0) {
        throw new Error("No accounts found. Please check your Saxo account.");
      }

      // Use first account
      accountKey = accountsData.Data[0].AccountKey;
      console.log("[Saxo] Using AccountKey:", accountKey);
    } catch (error) {
      console.error("[Saxo] Failed to get AccountKey:", error);
      throw error;
    }

    // Import SAXO_HORIZONS
    const { SAXO_HORIZONS } = await import("./adapters/saxoAdapter");
    
    // Get horizon (candle interval in minutes)
    const horizon = SAXO_HORIZONS[tf] || 15;
    const count = TRADING_CONFIG.MAX_CANDLES_BUFFER;

    try {
      // Step 2: Call our server-side Chart API route with AccountKey
      // Mode "From" requires Time parameter - use current time to get latest candles
      const currentTime = new Date().toISOString();
      
      const response = await fetch("/api/saxo/chart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: accessToken,
          accountKey: accountKey,
          uic: uic,
          assetType: resolvedAssetType, // assetType NYATA dari Saxo, bukan dari config
          horizon: horizon,
          count: count,
          mode: "UpTo",
          time: currentTime,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[Saxo] Chart API error:", error);
        throw new Error(error.details || `Chart API error: ${response.status}`);
      }

      const data = await response.json();

      // Debug: log raw API response
      console.log("[Saxo] Raw API response keys:", Object.keys(data));
      console.log("[Saxo] Data array length:", data.Data?.length || 0);
      
      if (data.Data && data.Data.length > 0) {
        console.log("[Saxo] First raw candle:", JSON.stringify(data.Data[0], null, 2));
        console.log("[Saxo] Last raw candle:", JSON.stringify(data.Data[data.Data.length - 1], null, 2));
      }

      // Transform Saxo format to our Candle format
      // IMPORTANT: Saxo API returns PascalCase property names (OpenBid, CloseBid, etc)
      const candles: Candle[] = (data.Data || []).map((item: Record<string, unknown>, index: number) => {
        // Saxo always provides Bid/Ask for FX with PascalCase names
        const openBid = typeof item.OpenBid === 'number' ? item.OpenBid : undefined;
        const openAsk = typeof item.OpenAsk === 'number' ? item.OpenAsk : undefined;
        const highBid = typeof item.HighBid === 'number' ? item.HighBid : undefined;
        const highAsk = typeof item.HighAsk === 'number' ? item.HighAsk : undefined;
        const lowBid = typeof item.LowBid === 'number' ? item.LowBid : undefined;
        const lowAsk = typeof item.LowAsk === 'number' ? item.LowAsk : undefined;
        const closeBid = typeof item.CloseBid === 'number' ? item.CloseBid : undefined;
        const closeAsk = typeof item.CloseAsk === 'number' ? item.CloseAsk : undefined;
        
        // Fallback to non-Bid/Ask fields for some asset types
        const openFallback = typeof item.Open === 'number' ? item.Open : 0;
        const highFallback = typeof item.High === 'number' ? item.High : 0;
        const lowFallback = typeof item.Low === 'number' ? item.Low : 0;
        const closeFallback = typeof item.Close === 'number' ? item.Close : 0;
        
        // Calculate mid price from Bid/Ask
        const open = openBid !== undefined && openAsk !== undefined
          ? (openBid + openAsk) / 2
          : openFallback;
        
        const high = highBid !== undefined && highAsk !== undefined
          ? (highBid + highAsk) / 2
          : highFallback;
        
        const low = lowBid !== undefined && lowAsk !== undefined
          ? (lowBid + lowAsk) / 2
          : lowFallback;
        
        const close = closeBid !== undefined && closeAsk !== undefined
          ? (closeBid + closeAsk) / 2
          : closeFallback;

        const candle = {
          time: new Date(item.Time as string).getTime(),
          open,
          high,
          low,
          close,
          volume: 0,
        };

        // Debug first and last candle transformation
        if (index === 0 || index === (data.Data?.length || 0) - 1) {
          console.log(`[Saxo] Candle ${index} transformation:`);
          console.log("  Raw:", { OpenBid: openBid, OpenAsk: openAsk, CloseBid: closeBid, CloseAsk: closeAsk });
          console.log("  Calculated:", { open, high, low, close });
          console.log("  Final candle:", candle);
        }

        return candle;
      }).filter((candle: Candle) => {
        const isValid = 
          !isNaN(candle.open) && 
          !isNaN(candle.high) && 
          !isNaN(candle.low) && 
          !isNaN(candle.close) &&
          candle.open > 0 &&
          candle.high > 0 &&
          candle.low > 0 &&
          candle.close > 0;
        
        if (!isValid) {
          console.warn("[Saxo] Filtered out invalid candle:", candle);
        }
        
        return isValid;
      });

      console.log("[Saxo] Received", candles.length, "valid candles out of", data.Data?.length || 0, "raw candles");
      
      if (candles.length > 0) {
        console.log("[Saxo] First transformed candle:", candles[0]);
        console.log("[Saxo] Last transformed candle:", candles[candles.length - 1]);
      }

      if (candles.length === 0) {
        console.warn("[Saxo] No valid candles after transformation");
        throw new Error("No valid chart data received");
      }

      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        candles: candles,
        currentPrice: candles.length > 0 ? candles[candles.length - 1].close : 0,
        isLoading: false,
        error: null,
      }));

      if (candles.length > 0) {
        prevPriceRef.current = candles[candles.length - 1].close;
      }
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
    setState(prev => ({ ...prev, isLoading: true }));
    
    if (instrument.broker === "SAXO") {
      // Saxo: fetch new candles for the timeframe
      try {
        await fetchSaxoCandles(tf, instrument);
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
