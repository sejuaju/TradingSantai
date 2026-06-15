/**
 * Saxo WebSocket Streaming — Implementasi Benar
 */

import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import { Candle } from "./types";
import { TRADING_CONFIG, API_CONFIG } from "./config";
import { getUIC } from "../../lib/saxo-uic-cache";
import { getAccessToken } from "../../lib/saxo-auth";

// ─── Binary Message Decoder ───────────────────────────────────────────────────
//
// Format binary Saxo yang BENAR (per dokumentasi OpenAPI):
// [MessageId: 8 byte Int64LE]
// [Reserved:  2 byte — HARUS DISKIP]
// [RefIdLen:  1 byte UInt8]
// [RefId:     n byte ASCII]
// [PayloadFmt:1 byte UInt8  (0=JSON, 1=Protobuf)]
// [PayloadSz: 4 byte Int32LE]
// [Payload:   m byte]
//
interface SaxoStreamMessage {
  messageId: number;
  referenceId: string;
  payload: Record<string, unknown> | null;
}

export function decodeSaxoMessages(buffer: ArrayBuffer): SaxoStreamMessage[] {
  const messages: SaxoStreamMessage[] = [];
  const view = new DataView(buffer);
  let offset = 0;

  while (offset < buffer.byteLength) {
    // Header minimum: 8 + 2 + 1 + 1 + 4 = 16 bytes
    if (offset + 16 > buffer.byteLength) break;

    // ─ MessageId: 8 bytes (Int64LE — ambil lower 32 bits cukup untuk logging)
    const messageId = view.getUint32(offset, true);
    offset += 8;

    // ─ Reserved: 2 bytes — SKIP (kode lama salah membaca ini sebagai refIdLen!)
    offset += 2;

    // ─ Reference ID Size: 1 byte UInt8 (kode lama pakai getUint16 = 2 bytes, SALAH)
    const refIdLen = view.getUint8(offset);
    offset += 1;

    // ─ Reference ID: refIdLen bytes
    if (offset + refIdLen > buffer.byteLength) break;
    const refIdBytes = new Uint8Array(buffer, offset, refIdLen);
    const referenceId = new TextDecoder().decode(refIdBytes);
    offset += refIdLen;

    // ─ Payload Format: 1 byte UInt8 (kode lama pakai getUint16 = 2 bytes, SALAH)
    if (offset + 1 > buffer.byteLength) break;
    const payloadFormat = view.getUint8(offset);
    offset += 1;

    // ─ Payload Size: 4 bytes Int32LE ← sudah benar
    if (offset + 4 > buffer.byteLength) break;
    const payloadSize = view.getUint32(offset, true);
    offset += 4;

    // ─ Payload
    let payload: Record<string, unknown> | null = null;
    if (payloadSize > 0 && payloadFormat === 0 && offset + payloadSize <= buffer.byteLength) {
      const payloadBytes = new Uint8Array(buffer, offset, payloadSize);
      try {
        payload = JSON.parse(new TextDecoder().decode(payloadBytes));
      } catch (error) {
        console.error("[Saxo WS] JSON parse error:", error);
      }
    }
    offset += payloadSize;

    messages.push({ messageId, referenceId, payload });
  }

  return messages;
}

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

interface ConnectSaxoStreamParams {
  instrument: {
    id: string;
    symbol: string;
    uic?: number;
    assetType?: string;
    searchKeywords?: string;
  };
  selectedTf: string;
  tfRef: MutableRefObject<string>;
  mountedRef: MutableRefObject<boolean>;
  wsRef: MutableRefObject<WebSocket | null>;
  reconnectTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setState: Dispatch<SetStateAction<MarketDataState>>;
  prevPriceRef: MutableRefObject<number>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export async function connectSaxoStream({
  instrument,
  selectedTf,
  tfRef,
  mountedRef,
  wsRef,
  reconnectTimer,
  setState,
  prevPriceRef,
}: ConnectSaxoStreamParams) {
  // ✅ Prevent multiple simultaneous connections
  if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
    console.log("[Saxo WS] Connection already in progress, skipping...");
    return;
  }
  
  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
    console.log("[Saxo WS] Already connected, skipping...");
    return;
  }

  // ✅ Cek token availability dengan retry
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.warn("[Saxo WS] No access token available - skipping WebSocket connection");
    setState(prev => ({ 
      ...prev, 
      connected: false,
      error: "Please login to enable live streaming" 
    }));
    return;
  }
  
  // ✅ Validasi token length (JWT minimal ~100 chars)
  if (accessToken.length < 50) {
    console.error("[Saxo WS] Token seems invalid (too short):", accessToken.length);
    setState(prev => ({ 
      ...prev, 
      connected: false,
      error: "Invalid authentication token" 
    }));
    return;
  }
  
  console.log("[Saxo WS] Token validated, length:", accessToken.length);

  // Resolve UIC dan AssetType
  let uic: number | undefined;
  let resolvedAssetType: string | undefined;

  if (instrument.searchKeywords && instrument.assetType) {
    try {
      const result = await getUIC(
        instrument.id,
        instrument.searchKeywords,
        instrument.assetType,
        accessToken
      );
      if (result) {
        uic = result.uic;
        resolvedAssetType = result.assetType;
      } else {
        uic = instrument.uic;
        resolvedAssetType = instrument.assetType;
      }
    } catch {
      uic = instrument.uic;
      resolvedAssetType = instrument.assetType;
    }
  } else {
    uic = instrument.uic;
    resolvedAssetType = instrument.assetType;
  }

  if (!uic || !resolvedAssetType) {
    console.error("[Saxo WS] Missing UIC or AssetType");
    return;
  }

  // Dapatkan AccountKey
  let accountKey: string;
  try {
    const res = await fetch("/api/saxo/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });
    if (!res.ok) throw new Error("Accounts API failed");
    const data = await res.json();
    if (!data.Data?.length) throw new Error("No accounts");
    accountKey = data.Data[0].AccountKey;
  } catch (error) {
    console.error("[Saxo WS] Failed to get AccountKey:", error);
    return;
  }

  // ContextId dan ReferenceId dibuat client-side
  const contextId   = `app-${Date.now()}`.slice(0, 50);
  const referenceId = `chart-${uic}`;
  const connectionId = `ws-${Date.now()}`; // ✅ Unique ID untuk debugging

  // ✅ FIX 1: URL yang benar — streaming domain, BUKAN gateway (REST)
  // Old URL (deprecated Des 2025): wss://streaming.saxobank.com/sim/openapi/streamingws/connect
  // New URL (Juni 2026+): wss://sim-streaming.saxobank.com/sim/oapi/streaming/ws/connect
  const isLive = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT === "LIVE";
  const wsBaseUrl = isLive
    ? "wss://streaming.saxobank.com/openapi/streamingws/connect"
    : "wss://sim-streaming.saxobank.com/sim/oapi/streaming/ws/connect";

  const wsUrl = `${wsBaseUrl}`
    + `?contextId=${encodeURIComponent(contextId)}`
    + `&authorization=${encodeURIComponent("BEARER " + accessToken)}`;

  console.log(`[Saxo WS ${connectionId}] Connecting...`, { contextId, referenceId, uic, resolvedAssetType });

  // Tutup koneksi lama
  if (wsRef.current) {
    console.log("[Saxo WS] Closing existing connection, readyState:", wsRef.current.readyState);
    wsRef.current.onclose = null;
    wsRef.current.onerror = null;
    wsRef.current.onmessage = null;
    wsRef.current.onopen = null;
    wsRef.current.close(1000, "Reconnecting");
    wsRef.current = null;
  }

  const ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer"; // Wajib — Saxo kirim binary
  wsRef.current = ws;

  // ✅ Log initial connection attempt
  console.log(`[Saxo WS ${connectionId}] WebSocket created, readyState:`, ws.readyState, "(0=CONNECTING)");

  ws.onopen = async () => {
    console.log(`[Saxo WS ${connectionId}] ✅ Connected, readyState:`, ws.readyState, "(1=OPEN)");
    if (mountedRef.current) {
      setState(prev => ({ ...prev, connected: true }));
    }

    // Buat subscription SETELAH WebSocket connect
    try {
      const { SAXO_HORIZONS } = await import("./adapters/saxoAdapter");
      const horizon = SAXO_HORIZONS[tfRef.current] || 15;

      const subRes = await fetch("/api/saxo/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          uic,
          assetType: resolvedAssetType,
          contextId,
          referenceId,
          horizon,
          accountKey,
        }),
      });

      if (!subRes.ok) {
        console.error("[Saxo WS] Subscription failed:", await subRes.text());
      } else {
        console.log("[Saxo WS] ✅ Subscription created:", referenceId);
      }
    } catch (err) {
      console.error("[Saxo WS] Subscription error:", err);
    }
  };

  ws.onerror = (error) => {
    console.error("[Saxo WS] Error event:", {
      readyState: ws.readyState,
      url: ws.url,
      error
    });
    
    // Log readyState untuk debugging
    // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
    if (ws.readyState === 3) {
      console.error("[Saxo WS] Connection already closed when error occurred");
    }
  };

  ws.onclose = (event) => {
    console.log("[Saxo WS] Disconnected:", event.code, event.reason);
    if (!mountedRef.current) return;

    setState(prev => ({ ...prev, connected: false }));

    // Jangan reconnect jika:
    // 1. Normal closure (code 1000)
    // 2. Unauthorized/Auth error (code 1008 atau 4xxx)
    if (event.code === 1000 || event.code === 1008 || (event.code >= 4000 && event.code < 5000)) {
      console.log("[Saxo WS] Not reconnecting - code:", event.code);
      return;
    }

    // Reconnect dengan backoff
    reconnectTimer.current = setTimeout(() => {
      if (mountedRef.current) {
        console.log("[Saxo WS] Reconnecting...");
        connectSaxoStream({
          instrument, selectedTf, tfRef, mountedRef,
          wsRef, reconnectTimer, setState, prevPriceRef,
        });
      }
    }, API_CONFIG.RECONNECT_DELAY_MS);
  };

  ws.onmessage = (event) => {
    const buffer = event.data as ArrayBuffer;
    if (!(buffer instanceof ArrayBuffer)) {
      console.warn("[Saxo WS] ⚠️ Non-binary message, type:", typeof event.data, "— pastikan binaryType='arraybuffer' di-set sebelum onmessage");
      return;
    }

    // Debug: konfirmasi pesan benar-benar diterima
    console.log(`[Saxo WS] 📨 Binary message received, bytes: ${buffer.byteLength}`);

    try {
      const messages = decodeSaxoMessages(buffer);
      console.log(`[Saxo WS] Decoded ${messages.length} message(s):`, messages.map(m => ({ refId: m.referenceId, hasPayload: !!m.payload })));

      for (const msg of messages) {
        // ── Control messages ──────────────────────────────────────────────

        if (msg.referenceId === "_heartbeat") {
          // ✅ FIX 2: continue (bukan return) — lanjut ke pesan berikutnya
          // return akan exit seluruh handler, melewatkan pesan chart di batch yang sama
          continue;
        }

        if (msg.referenceId === "_resetsubscriptions") {
          console.warn("[Saxo WS] Reset subscriptions — reconnecting...");
          ws.close(4000, "Reset subscriptions");
          return;
        }

        if (msg.referenceId === "_disconnect") {
          console.warn("[Saxo WS] Server disconnect");
          ws.close(4001, "Server disconnect");
          return;
        }

        // ── Chart update ──────────────────────────────────────────────────
        if (msg.referenceId !== referenceId || !msg.payload) continue;

        const chartUpdate = msg.payload as {
          Data?: Array<{
            Time: string;
            OpenBid?: number; OpenAsk?: number;
            HighBid?: number; HighAsk?: number;
            LowBid?: number;  LowAsk?: number;
            CloseBid?: number; CloseAsk?: number;
          }>;
        };

        if (!chartUpdate.Data?.length) continue;

        const latest = chartUpdate.Data[chartUpdate.Data.length - 1];
        const open  = ((latest.OpenBid  ?? 0) + (latest.OpenAsk  ?? 0)) / 2;
        const high  = ((latest.HighBid  ?? 0) + (latest.HighAsk  ?? 0)) / 2;
        const low   = ((latest.LowBid   ?? 0) + (latest.LowAsk   ?? 0)) / 2;
        const close = ((latest.CloseBid ?? 0) + (latest.CloseAsk ?? 0)) / 2;

        if (close <= 0) continue;

        const liveCandle: Candle = {
          time: new Date(latest.Time).getTime(),
          open, high, low, close,
          volume: 0,
        };

        prevPriceRef.current = close;

        setState(prev => {
          // ✅ FIX 3: Tidak perlu type cast — prev sudah bertipe MarketDataState
          const updated = [...prev.candles];
          const last = updated[updated.length - 1];

          if (last?.time === liveCandle.time) {
            updated[updated.length - 1] = liveCandle;
          } else {
            updated.push(liveCandle);
            if (updated.length > TRADING_CONFIG.MAX_CANDLES_BUFFER) {
              updated.shift();
            }
          }

          return { ...prev, candles: updated, currentPrice: close };
        });
      }
    } catch (error) {
      console.error("[Saxo WS] Message decode error:", error);
    }
  };
}