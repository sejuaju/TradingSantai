"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Candle, Signal } from "./types";
import {
  calcEMA, calcRSI, calcMACD,
  calcScores, detectSignals,
  ScoreBreakdown, MAX_SCORE,
} from "./indicators";
import { TRADING_CONFIG, UPDATE_INTERVALS, INDICATOR_CONFIG } from "./config";

const EMPTY_BREAKDOWN: ScoreBreakdown = {
  buyScore: 0, sellScore: 0, items: [], bias: "NEUTRAL", strength: "WEAK",
};

export function useSignals(
  candles: Candle[],
  htfTrend: "bullish" | "bearish" | "neutral",
  instrumentId: string,
) {
  const [signals, setSignals] = useState<Signal[]>([]);

  // ─── Refs: tidak trigger re-render, selalu fresh ────────────────────────────
  const lastSignalTime  = useRef(0);
  const instrumentRef   = useRef(instrumentId);
  const htfTrendRef     = useRef(htfTrend);
  const candlesRef      = useRef<Candle[]>([]);   // ← FIX: selalu fresh
  const signalsRef      = useRef<Signal[]>([]);   // ← FIX: selalu fresh
  const debugThrottle   = useRef(0);              // throttle log

  // Reset sinyal saat ganti instrument — hindari posisi BTC di chart Gold
  useEffect(() => {
    if (instrumentRef.current === instrumentId) return;
    instrumentRef.current = instrumentId;
    lastSignalTime.current = 0;
    setSignals([]);
    signalsRef.current = [];
    console.log(`[SIGNAL] Instrument → ${instrumentId}, signals cleared`);
  }, [instrumentId]);

  // Sync refs setiap render
  useEffect(() => { htfTrendRef.current  = htfTrend; },  [htfTrend]);
  useEffect(() => { candlesRef.current   = candles;  },  [candles]);

  // Sync signals ref setiap kali signals berubah
  useEffect(() => { signalsRef.current = signals; }, [signals]);

  // ─── Signal Detection (FIX: Better throttling & logging) ──────────────────────
  const runDetection = useCallback(() => {
    const latestCandles = candlesRef.current;
    const latestSignals = signalsRef.current;

    if (latestCandles.length < TRADING_CONFIG.MIN_CANDLES) {
      // Debug: candles belum cukup (throttled)
      const now = Date.now();
      if (now - debugThrottle.current > UPDATE_INTERVALS.DEBUG_THROTTLE_MS) {
        debugThrottle.current = now;
        console.warn(
          `[SIGNAL] ⚠ Candles terlalu sedikit: ${latestCandles.length}/${TRADING_CONFIG.MIN_CANDLES} — sinyal tidak bisa di-detect.`
        );
      }
      return;
    }

    const active  = latestSignals.filter(s => s.status === "active");
    // Sinyal closed terbaru (maks 5) untuk cek consecutive direction & price dist
    const recentClosed = latestSignals
      .filter(s => s.status !== "active")
      .slice(0, 5);

    const signal = detectSignals(
      latestCandles,
      lastSignalTime.current,
      htfTrendRef.current,
      active,
      recentClosed   // ← STRATEGI: kirim sinyal closed terbaru
    );

    if (signal) {
      const tagged: Signal = { ...signal, instrumentId: instrumentRef.current };
      console.log(`[SIGNAL] ✅ ${tagged.type} @ ${tagged.price.toFixed(2)} | ${instrumentRef.current} | ${tagged.reason}`);
      lastSignalTime.current = tagged.time;
      setSignals((prev) => [tagged, ...prev].slice(0, TRADING_CONFIG.MAX_SIGNALS_HISTORY));
    }
  }, []);

  // ─── TA Indicator values (FIX: Compute directly without useMemo/useEffect) ───
  // FIX: Calculate indicators directly in render using htfTrend prop (not ref)
  const indicators = (() => {
    if (candles.length < 2) {
      return {
        rsi: 50,
        ema50: 0,
        ema200: 0,
        macd: 0,
        macdSignal: 0,
        scoreBreakdown: EMPTY_BREAKDOWN,
      };
    }

    const closes   = candles.map((c) => c.close);
    const ema50Arr  = calcEMA(closes, INDICATOR_CONFIG.EMA_SHORT);
    const ema200Arr = calcEMA(closes, INDICATOR_CONFIG.EMA_LONG);
    const rsiArr   = calcRSI(closes);
    const { macd: macdArr, signal: macdSigArr } = calcMACD(closes);

    const len = closes.length;
    
    return {
      rsi: rsiArr[len - 1],
      ema50: ema50Arr[len - 1],
      ema200: ema200Arr[len - 1],
      macd: macdArr[len - 1],
      macdSignal: macdSigArr[len - 1],
      scoreBreakdown: calcScores(candles, htfTrend), // Use prop, not ref
    };
  })();

  // ─── Guard: cegah detection dari candle historis ──────────────────────────
  const prevCandlesLen     = useRef(0);
  const prevCandleDuration = useRef(0); // deteksi TF switch

  // ─── Combined effect for TP/SL tracking & signal detection ───────────────────
  useEffect(() => {
    if (candles.length < TRADING_CONFIG.MIN_CANDLES) return;

    const prevLen            = prevCandlesLen.current;
    prevCandlesLen.current   = candles.length;

    // Durasi candle = selisih waktu antar 2 candle pertama
    const candleDuration     = candles.length >= 2 ? candles[1].time - candles[0].time : 0;
    const prevDuration       = prevCandleDuration.current;
    prevCandleDuration.current = candleDuration;

    // Dua kondisi yang menandakan data historis (bukan live):
    // 1. Lompatan besar candles.length (initial load) — misal 0→100
    // 2. Durasi candle berubah (switch timeframe) — misal 1m→5m
    const isBatchLoad = candles.length - prevLen > 10;
    const isTFSwitch  = prevDuration > 0 && candleDuration !== prevDuration;

    if (isBatchLoad || isTFSwitch) {
      // FIX: pakai Date.now() bukan candle.time
      // candle.time = open time candle (bisa lama) → cooldown langsung lolos
      // Date.now() = waktu nyata sekarang → cooldown berjalan dari sekarang
      lastSignalTime.current = Date.now();
      console.log(
        `[SIGNAL] 📦 ${
          isTFSwitch ? `TF switch (${prevDuration/1000}s→${candleDuration/1000}s)` : `Batch load ${candles.length} candles`
        } — cooldown dimulai dari sekarang`
      );
      return;
    }

    // TP/SL check + signal detection in same effect
    const livePrice = candles[candles.length - 1].close;

    setSignals((prev) => {
      let changed = false;
      const updated = prev.map((s) => {
        if (s.status !== "active") return s;
        if (s.type === "BUY") {
          if (livePrice >= s.tp) {
            changed = true;
            console.log(`[SIGNAL] ✅ BUY TP HIT @ ${livePrice.toFixed(2)}`);
            return { ...s, status: "win" as const, closePrice: livePrice, closeTime: Date.now() };
          }
          if (livePrice <= s.sl) {
            changed = true;
            console.log(`[SIGNAL] ❌ BUY SL HIT @ ${livePrice.toFixed(2)}`);
            return { ...s, status: "loss" as const, closePrice: livePrice, closeTime: Date.now() };
          }
        } else {
          if (livePrice <= s.tp) {
            changed = true;
            console.log(`[SIGNAL] ✅ SELL TP HIT @ ${livePrice.toFixed(2)}`);
            return { ...s, status: "win" as const, closePrice: livePrice, closeTime: Date.now() };
          }
          if (livePrice >= s.sl) {
            changed = true;
            console.log(`[SIGNAL] ❌ SELL SL HIT @ ${livePrice.toFixed(2)}`);
            return { ...s, status: "loss" as const, closePrice: livePrice, closeTime: Date.now() };
          }
        }
        return s;
      });
      return changed ? updated : prev;
    });
    
    // Run signal detection
    runDetection();
  }, [candles, runDetection]);

  const instrumentSignals = signals.filter(
    s => !s.instrumentId || s.instrumentId === instrumentId,
  );

  return {
    signals: instrumentSignals,
    rsiValue: indicators.rsi,
    ema50Value: indicators.ema50,
    ema200Value: indicators.ema200,
    macdValue: indicators.macd,
    macdSignalValue: indicators.macdSignal,
    scoreBreakdown: indicators.scoreBreakdown,
  };
}

export type { ScoreBreakdown };
export { MAX_SCORE };
