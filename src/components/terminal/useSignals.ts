"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { fetchUserPositions, syncUserPositions } from "@/lib/supabase/positions";
import { loadUserSignals, saveUserSignals } from "@/lib/userSignalsStorage";
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

function belongsToUser(s: Signal, userId: string | null): boolean {
  return userId ? s.userId === userId : !s.userId;
}

export function useSignals(
  candles: Candle[],
  htfTrend: "bullish" | "bearish" | "neutral",
  instrumentId: string,
  timeframe: string,
) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [signals, setSignals] = useState<Signal[]>([]);

  const lastSignalTime  = useRef(0);
  const instrumentRef   = useRef(instrumentId);
  const timeframeRef    = useRef(timeframe);
  const userIdRef       = useRef<string | null>(null);
  const loadedForUserRef = useRef<string | null>(null);
  const positionsReadyRef = useRef(false);
  const syncTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const htfTrendRef     = useRef(htfTrend);
  const candlesRef      = useRef<Candle[]>([]);
  const signalsRef      = useRef<Signal[]>([]);
  const debugThrottle   = useRef(0);

  useEffect(() => {
    instrumentRef.current = instrumentId;
  }, [instrumentId]);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function applySignals(loaded: Signal[]) {
      if (cancelled) return;
      setSignals(loaded);
      signalsRef.current = loaded;
      lastSignalTime.current = loaded.reduce((max, s) => Math.max(max, s.time), 0);
      positionsReadyRef.current = true;
    }

    async function loadPositions() {
      positionsReadyRef.current = false;
      userIdRef.current = userId;

      if (!userId) {
        loadedForUserRef.current = null;
        await applySignals(loadUserSignals(null));
        return;
      }

      if (loadedForUserRef.current === userId) {
        positionsReadyRef.current = true;
        return;
      }

      const supabase = createClient();
      const localFallback = loadUserSignals(userId);

      if (!supabase) {
        await applySignals(localFallback);
        loadedForUserRef.current = userId;
        return;
      }

      try {
        const fromDb = await fetchUserPositions(supabase, userId);
        if (cancelled) return;

        if (fromDb.length > 0) {
          saveUserSignals(userId, fromDb);
          await applySignals(fromDb);
          console.log(`[SIGNAL] Supabase: ${fromDb.length} posisi dimuat`);
        } else if (localFallback.length > 0) {
          await applySignals(localFallback);
          await syncUserPositions(supabase, userId, localFallback);
          console.log(`[SIGNAL] Migrasi ${localFallback.length} posisi ke Supabase`);
        } else {
          await applySignals([]);
        }
        loadedForUserRef.current = userId;
      } catch (err) {
        if (cancelled) return;
        await applySignals(localFallback);
        loadedForUserRef.current = userId;
        if (err instanceof Error && err.message === "TABLE_MISSING") {
          console.warn("[SIGNAL] Tabel user_positions belum dibuat — pakai penyimpanan lokal");
        } else {
          console.error("[SIGNAL] Gagal memuat dari Supabase:", err);
        }
      }
    }

    loadPositions();
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  useEffect(() => {
    if (authLoading || !positionsReadyRef.current) return;

    saveUserSignals(userId, signals);

    if (!userId) return;

    const supabase = createClient();
    if (!supabase) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      syncUserPositions(supabase, userId, signals).catch((err) => {
        if (err instanceof Error && err.message === "TABLE_MISSING") {
          console.warn("[SIGNAL] Tabel user_positions belum dibuat — simpan lokal saja");
          return;
        }
        console.error("[SIGNAL] Gagal sync ke Supabase:", err);
      });
    }, 600);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [signals, userId, authLoading]);

  useEffect(() => { htfTrendRef.current  = htfTrend; },  [htfTrend]);
  useEffect(() => { candlesRef.current   = candles;  },  [candles]);
  useEffect(() => { signalsRef.current = signals; }, [signals]);

  const runDetection = useCallback(() => {
    const latestCandles = candlesRef.current;
    const latestSignals = signalsRef.current;
    const ownerId = userIdRef.current;

    if (latestCandles.length < TRADING_CONFIG.MIN_CANDLES) {
      const now = Date.now();
      if (now - debugThrottle.current > UPDATE_INTERVALS.DEBUG_THROTTLE_MS) {
        debugThrottle.current = now;
        console.warn(
          `[SIGNAL] ⚠ Candles terlalu sedikit: ${latestCandles.length}/${TRADING_CONFIG.MIN_CANDLES} — sinyal tidak bisa di-detect.`
        );
      }
      return;
    }

    const scoped = latestSignals.filter((s) => belongsToUser(s, ownerId));
    const active  = scoped.filter(s => s.status === "active");
    const recentClosed = scoped
      .filter(s => s.status !== "active")
      .slice(0, 5);

    const signal = detectSignals(
      latestCandles,
      lastSignalTime.current,
      htfTrendRef.current,
      active,
      recentClosed
    );

    if (signal) {
      const tagged: Signal = {
        ...signal,
        instrumentId: instrumentRef.current,
        userId: ownerId ?? undefined,
        entryTimeframe: timeframeRef.current,
      };
      console.log(`[SIGNAL] ✅ ${tagged.type} @ ${tagged.price.toFixed(2)} | ${instrumentRef.current} | ${tagged.reason}`);
      lastSignalTime.current = tagged.time;
      setSignals((prev) => {
        const scopedPrev = prev.filter((s) => belongsToUser(s, ownerId));
        return [tagged, ...scopedPrev].slice(0, TRADING_CONFIG.MAX_SIGNALS_HISTORY);
      });
    }
  }, []);

  const indicators = (() => {
    if (candles.length < 2) {
      return {
        rsi: 50,
        ema9: 0,
        ema21: 0,
        macd: 0,
        macdSignal: 0,
        scoreBreakdown: EMPTY_BREAKDOWN,
      };
    }

    const closes   = candles.map((c) => c.close);
    const ema9Arr  = calcEMA(closes, INDICATOR_CONFIG.EMA_SHORT);
    const ema21Arr = calcEMA(closes, INDICATOR_CONFIG.EMA_LONG);
    const rsiArr   = calcRSI(closes);
    const { macd: macdArr, signal: macdSigArr } = calcMACD(closes);

    const len = closes.length;
    
    return {
      rsi: rsiArr[len - 1],
      ema9: ema9Arr[len - 1],
      ema21: ema21Arr[len - 1],
      macd: macdArr[len - 1],
      macdSignal: macdSigArr[len - 1],
      scoreBreakdown: calcScores(candles, htfTrend),
    };
  })();

  const prevCandlesLen     = useRef(0);
  const prevCandleDuration = useRef(0);

  useEffect(() => {
    if (candles.length < TRADING_CONFIG.MIN_CANDLES) return;

    const prevLen            = prevCandlesLen.current;
    prevCandlesLen.current   = candles.length;

    const candleDuration     = candles.length >= 2 ? candles[1].time - candles[0].time : 0;
    const prevDuration       = prevCandleDuration.current;
    prevCandleDuration.current = candleDuration;

    const isBatchLoad = candles.length - prevLen > 10;
    const isTFSwitch  = prevDuration > 0 && candleDuration !== prevDuration;

    if (isBatchLoad || isTFSwitch) {
      lastSignalTime.current = Date.now();
      console.log(
        `[SIGNAL] 📦 ${
          isTFSwitch ? `TF switch (${prevDuration/1000}s→${candleDuration/1000}s)` : `Batch load ${candles.length} candles`
        } — cooldown dimulai dari sekarang`
      );
      return;
    }

    const livePrice = candles[candles.length - 1].close;
    const ownerId = userIdRef.current;

    setSignals((prev) => {
      let changed = false;
      const updated = prev.map((s) => {
        if (!belongsToUser(s, ownerId) || s.status !== "active") return s;
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
    
    runDetection();
  }, [candles, runDetection]);

  const userSignals = signals.filter((s) => belongsToUser(s, userId));

  const instrumentSignals = userSignals.filter(
    s => !s.instrumentId || s.instrumentId === instrumentId,
  );

  return {
    signals: instrumentSignals,
    userSignals,
    isLoggedIn: !!userId,
    rsiValue: indicators.rsi,
    ema9Value: indicators.ema9,
    ema21Value: indicators.ema21,
    macdValue: indicators.macd,
    macdSignalValue: indicators.macdSignal,
    scoreBreakdown: indicators.scoreBreakdown,
  };
}

export type { ScoreBreakdown };
export { MAX_SCORE };