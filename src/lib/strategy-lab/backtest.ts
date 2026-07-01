import type { Candle, Signal } from "@/components/terminal/types";
import { calcATR, calcEMA, calcRSI } from "@/components/terminal/indicators";
import { compileOnTick } from "./transpile";
import type { BacktestResult, BacktestTrade, BarContext, OnTickFn } from "./types";

const MIN_BARS = 35;

interface PendingSignal {
  type: "BUY" | "SELL";
  slDist: number;
  tpDist: number;
}

function buildIndicators(candles: Candle[]) {
  const closes = candles.map((c) => c.close);
  const rsi = calcRSI(closes);
  const emaCache = new Map<number, number[]>();

  const getEma = (period: number) => {
    if (!emaCache.has(period)) emaCache.set(period, calcEMA(closes, period));
    return emaCache.get(period)!;
  };

  return { rsi, getEma };
}

function simulateTrades(candles: Candle[], signals: Signal[]): BacktestTrade[] {
  const trades: BacktestTrade[] = [];
  let openTrade: BacktestTrade | null = null;

  const sorted = [...signals].sort((a, b) => a.time - b.time);
  let sigIdx = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];

    while (sigIdx < sorted.length && sorted[sigIdx].time <= c.time) {
      const s = sorted[sigIdx];
      if (!openTrade) {
        openTrade = {
          type: s.type,
          entryPrice: s.price,
          sl: s.sl,
          tp: s.tp,
          entryTime: s.time,
          exitPrice: s.price,
          exitTime: s.time,
          result: "loss",
          pnl: 0,
        };
      }
      sigIdx++;
    }

    if (!openTrade) continue;

    const hitSl =
      openTrade.type === "BUY"
        ? c.low <= openTrade.sl
        : c.high >= openTrade.sl;
    const hitTp =
      openTrade.type === "BUY"
        ? c.high >= openTrade.tp
        : c.low <= openTrade.tp;

    if (hitSl || hitTp) {
      openTrade.exitPrice = hitSl ? openTrade.sl : openTrade.tp;
      openTrade.exitTime = c.time;
      openTrade.result = hitTp ? "win" : "loss";
      openTrade.pnl =
        openTrade.type === "BUY"
          ? openTrade.exitPrice - openTrade.entryPrice
          : openTrade.entryPrice - openTrade.exitPrice;
      trades.push(openTrade);
      openTrade = null;
    }
  }

  const tailTrade = openTrade as BacktestTrade | null;
  if (tailTrade && candles.length > 0) {
    const last = candles[candles.length - 1]!;
    const exitPrice = last.close;
    const pnl =
      tailTrade.type === "BUY"
        ? exitPrice - tailTrade.entryPrice
        : tailTrade.entryPrice - exitPrice;
    trades.push({
      ...tailTrade,
      exitPrice,
      exitTime: last.time,
      pnl,
      result: pnl >= 0 ? "win" : "loss",
    });
  }

  return trades;
}

function runBarLoop(candles: Candle[], onTick: OnTickFn, inputs: Record<string, number>): Signal[] {
  const { rsi, getEma } = buildIndicators(candles);
  const signals: Signal[] = [];
  let cooldownUntil = 0;

  for (let i = MIN_BARS; i < candles.length; i++) {
    let pendingSignal: PendingSignal | null = null;
    const slice = candles.slice(0, i + 1);
    const atr = calcATR(slice, 14);

    const ctx: BarContext = {
      bar: i,
      close: candles[i].close,
      open: candles[i].open,
      high: candles[i].high,
      low: candles[i].low,
      time: candles[i].time,
      iRSI: (period) => rsi[i] ?? 50,
      iMA: (period) => getEma(period)[i] ?? candles[i].close,
      iEMA: (period) => getEma(period)[i] ?? candles[i].close,
      iATR: () => atr,
      signalBuy: (slDist, tpDist) => {
        pendingSignal = { type: "BUY", slDist, tpDist };
      },
      signalSell: (slDist, tpDist) => {
        pendingSignal = { type: "SELL", slDist, tpDist };
      },
    };

    try {
      onTick(ctx, inputs);
    } catch {
      break;
    }

    const fired = pendingSignal as PendingSignal | null;
    if (!fired || candles[i].time < cooldownUntil) continue;

    const entry = candles[i].close;
    const sl =
      fired.type === "BUY"
        ? entry - fired.slDist
        : entry + fired.slDist;
    const tp =
      fired.type === "BUY"
        ? entry + fired.tpDist
        : entry - fired.tpDist;

    signals.push({
      type: fired.type,
      price: entry,
      sl,
      tp,
      rsi: rsi[i] ?? 50,
      reason: "Strategy Lab",
      time: candles[i].time,
      status: "active",
    });

    cooldownUntil = candles[i].time + 300_000 * 3;
  }

  return signals;
}

/** Built-in TS SMC trial — simplified structure logic without exposing source */
export function runBuiltinSmcTrial(candles: Candle[]): Signal[] {
  const closes = candles.map((c) => c.close);
  const ema50 = calcEMA(closes, 9);
  const ema200 = calcEMA(closes, 21);
  const rsi = calcRSI(closes);
  const signals: Signal[] = [];
  let cooldownUntil = 0;

  for (let i = MIN_BARS; i < candles.length; i++) {
    if (candles[i].time < cooldownUntil) continue;
    const slice = candles.slice(0, i + 1);
    const atr = calcATR(slice, 14);
    const bullTrend = ema50[i] > ema200[i];
    const bearTrend = ema50[i] < ema200[i];
    const swingLow = Math.min(...candles.slice(i - 8, i + 1).map((c) => c.low));
    const nearSupport = Math.abs(candles[i].close - swingLow) <= atr * 0.6;

    if (bullTrend && nearSupport && rsi[i] < 42) {
      const entry = candles[i].close;
      signals.push({
        type: "BUY",
        price: entry,
        sl: entry - atr * 1.5,
        tp: entry + atr * 2.5,
        rsi: rsi[i],
        reason: "SMC Trial • structure↑ • support",
        time: candles[i].time,
        status: "active",
      });
      cooldownUntil = candles[i].time + 300_000 * 4;
    } else if (bearTrend && rsi[i] > 58 && candles[i].close < ema200[i]) {
      const entry = candles[i].close;
      signals.push({
        type: "SELL",
        price: entry,
        sl: entry + atr * 1.5,
        tp: entry - atr * 2.5,
        rsi: rsi[i],
        reason: "SMC Trial • structure↓",
        time: candles[i].time,
        status: "active",
      });
      cooldownUntil = candles[i].time + 300_000 * 4;
    }
  }

  return signals;
}

function summarize(trades: BacktestTrade[]): Pick<
  BacktestResult,
  "winRate" | "totalTrades" | "profitFactor" | "netPnl" | "maxDrawdown"
> {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.result === "win");
  const winRate = totalTrades ? (wins.length / totalTrades) * 100 : 0;
  const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(
    trades.filter((t) => t.result === "loss").reduce((s, t) => s + t.pnl, 0),
  );
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0);

  let peak = 0;
  let equity = 0;
  let maxDrawdown = 0;
  for (const t of trades) {
    equity += t.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
  }

  return { winRate, totalTrades, profitFactor, netPnl, maxDrawdown };
}

export function runBacktestFromSource(candles: Candle[], source: string): BacktestResult {
  if (candles.length < MIN_BARS) {
    return {
      ok: false,
      error: `Minimal ${MIN_BARS} candle untuk backtest.`,
      signals: [],
      trades: [],
      winRate: 0,
      totalTrades: 0,
      profitFactor: 0,
      netPnl: 0,
      maxDrawdown: 0,
    };
  }

  const compiled = compileOnTick(source);
  if (!compiled.ok || !compiled.onTick) {
    return {
      ok: false,
      error: compiled.error ?? "Compile gagal.",
      signals: [],
      trades: [],
      winRate: 0,
      totalTrades: 0,
      profitFactor: 0,
      netPnl: 0,
      maxDrawdown: 0,
    };
  }

  const inputMap = Object.fromEntries(compiled.inputs.map((i) => [i.name, i.value]));
  const signals = runBarLoop(candles, compiled.onTick, inputMap);
  const trades = simulateTrades(candles, signals);

  return {
    ok: true,
    signals,
    trades,
    ...summarize(trades),
  };
}

/** Gabungkan hasil trade ke signal agar chart bisa tampilkan win/loss marker */
export function enrichSignalsWithTrades(
  signals: Signal[],
  trades: BacktestTrade[],
): Signal[] {
  const tradeByTime = new Map(trades.map((t) => [t.entryTime, t]));
  return signals.map((s) => {
    const trade = tradeByTime.get(s.time);
    if (!trade) return s;
    return {
      ...s,
      status: trade.result,
      closePrice: trade.exitPrice,
      closeTime: trade.exitTime,
    };
  });
}

export function runBacktestBuiltin(candles: Candle[], runner: "ts-smc-trial"): BacktestResult {
  const signals = runner === "ts-smc-trial" ? runBuiltinSmcTrial(candles) : [];
  const trades = simulateTrades(candles, signals);
  return {
    ok: true,
    signals,
    trades,
    ...summarize(trades),
  };
}