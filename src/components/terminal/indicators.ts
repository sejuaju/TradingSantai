import { Candle, Signal } from "./types";
import {
  INDICATOR_CONFIG, SCORE_WEIGHTS, RSI_CONFIG, SIGNAL_CONFIG,
  MAX_SCORE, STRENGTH_CONFIG, candleDurationToTfKey, getSignalCooldownMs,
} from "./config";

export function calcEMA(closes: number[], period: number): number[] {
  const ema: number[] = [];
  if (closes.length === 0) return ema;
  const k = 2 / (period + 1);
  ema[0] = closes[0];
  for (let i = 1; i < closes.length; i++) {
    ema[i] = closes[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

export function calcRSI(closes: number[], period = INDICATOR_CONFIG.RSI_PERIOD): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length < period + 1) return rsi;
  let gainSum = 0, lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff; else lossSum += Math.abs(diff);
  }
  let avgGain = gainSum / period, avgLoss = lossSum / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff >= 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    rsi[i]  = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

export function calcMACD(closes: number[]): {
  macd: number[]; signal: number[]; histogram: number[];
} {
  const ema12    = calcEMA(closes, INDICATOR_CONFIG.MACD_FAST);
  const ema26    = calcEMA(closes, INDICATOR_CONFIG.MACD_SLOW);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const sigLine  = calcEMA(macdLine, INDICATOR_CONFIG.MACD_SIGNAL);
  return { macd: macdLine, signal: sigLine, histogram: macdLine.map((v, i) => v - sigLine[i]) };
}

export function calcATR(candles: Candle[], period: number = INDICATOR_CONFIG.ATR_PERIOD): number {
  if (candles.length < period + 1)
    return candles.length > 0 ? candles[candles.length - 1].high - candles[candles.length - 1].low : 100;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    sum += Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low  - candles[i - 1].close)
    );
  }
  return sum / period;
}

export function isVolumeConfirmed(candles: Candle[], index: number): boolean {
  if (index < INDICATOR_CONFIG.VOLUME_MA_PERIOD) return true;
  const avg = candles
    .slice(index - INDICATOR_CONFIG.VOLUME_MA_PERIOD, index)
    .reduce((s, c) => s + c.volume, 0) / INDICATOR_CONFIG.VOLUME_MA_PERIOD;
  return candles[index].volume > avg * INDICATOR_CONFIG.VOLUME_THRESHOLD;
}

export type CandlePattern =
  | "bullish_engulfing" | "bearish_engulfing"
  | "hammer" | "shooting_star" | "doji" | null;

export function detectCandlePattern(candles: Candle[], index: number): CandlePattern {
  if (index < 1) return null;
  const curr = candles[index], prev = candles[index - 1];
  const body = Math.abs(curr.close - curr.open);
  const range = curr.high - curr.low;
  const pBody = Math.abs(prev.close - prev.open);
  if (range > 0 && body / range < 0.1) return "doji";
  if (prev.close < prev.open && curr.close > curr.open && curr.close > prev.open && curr.open < prev.close && body > pBody) return "bullish_engulfing";
  if (prev.close > prev.open && curr.close < curr.open && curr.open > prev.close && curr.close < prev.open && body > pBody) return "bearish_engulfing";
  const lw = Math.min(curr.open, curr.close) - curr.low;
  const uw = curr.high - Math.max(curr.open, curr.close);
  if (lw > body * 2 && uw < body * 0.5 && body > 0) return "hammer";
  if (uw > body * 2 && lw < body * 0.5 && body > 0) return "shooting_star";
  return null;
}

export function findSwingLevels(
  candles: Candle[], lookback = 80, pivot = 3
): { highs: number[]; lows: number[] } {
  const highs: number[] = [], lows: number[] = [];
  const start = Math.max(pivot, candles.length - lookback);
  const end   = candles.length - pivot - 1;
  for (let i = start; i <= end; i++) {
    const win  = candles.slice(i - pivot, i + pivot + 1);
    const maxH = Math.max(...win.map(c => c.high));
    const minL = Math.min(...win.map(c => c.low));
    if (candles[i].high === maxH) highs.push(candles[i].high);
    if (candles[i].low  === minL) lows.push(candles[i].low);
  }
  const cluster = (lvls: number[]) => {
    const sorted = [...new Set(lvls)].sort((a, b) => a - b);
    const out: number[] = [];
    for (const l of sorted) {
      if (!out.length || Math.abs(l - out[out.length - 1]) / l > 0.001) out.push(l);
    }
    return out;
  };
  return { highs: cluster(highs), lows: cluster(lows) };
}

// ─── Score Breakdown ──────────────────────────────────────────────────────────
export interface ScoreItem {
  name: string; buyContrib: number; sellContrib: number; maxPossible: number;
}
export interface ScoreBreakdown {
  buyScore: number; sellScore: number; items: ScoreItem[];
  bias: "BUY" | "SELL" | "NEUTRAL"; strength: "STRONG" | "MODERATE" | "WEAK";
}

export { MAX_SCORE };

interface ScoreComputeResult extends ScoreBreakdown {
  reasons: string[];
  currentRSI: number;
  atr: number;
}

/** HTF trend dari array close — dipakai Binance & Saxo */
export function computeHtfTrendFromCloses(closes: number[]): "bullish" | "bearish" | "neutral" {
  if (closes.length < INDICATOR_CONFIG.EMA_LONG) return "neutral";
  const ema50  = calcEMA(closes, INDICATOR_CONFIG.EMA_SHORT);
  const ema200 = calcEMA(closes, INDICATOR_CONFIG.EMA_LONG);
  const last   = closes.length - 1;
  if (ema50[last] > ema200[last] && closes[last] > ema50[last]) return "bullish";
  if (ema50[last] < ema200[last] && closes[last] < ema50[last]) return "bearish";
  return "neutral";
}

function classifyStrength(top: number): ScoreBreakdown["strength"] {
  if (top >= STRENGTH_CONFIG.STRONG_MIN) return "STRONG";
  if (top >= STRENGTH_CONFIG.MODERATE_MIN) return "MODERATE";
  return "WEAK";
}

/** Satu sumber kebenaran — UI score & signal engine memakai fungsi yang sama */
function computeScoreBreakdown(
  candles: Candle[],
  htfTrend: "bullish" | "bearish" | "neutral",
  collectReasons = false,
): ScoreComputeResult | null {
  if (candles.length < INDICATOR_CONFIG.EMA_LONG) return null;

  const closes = candles.map(c => c.close);
  const ema50  = calcEMA(closes, INDICATOR_CONFIG.EMA_SHORT);
  const ema200 = calcEMA(closes, INDICATOR_CONFIG.EMA_LONG);
  const rsi    = calcRSI(closes);
  const { histogram } = calcMACD(closes);

  const len = closes.length;
  const i   = len - 1;
  const prev = len - 2;
  if (prev < 1) return null;

  const currentRSI = rsi[i];
  const volConf    = isVolumeConfirmed(candles, i);
  const isBuyCan   = candles[i].close >= candles[i].open;
  const pattern    = detectCandlePattern(candles, i) ?? detectCandlePattern(candles, i - 1);
  const macdBull   = histogram[i] > 0 && histogram[i] > histogram[prev];
  const macdBear   = histogram[i] < 0 && histogram[i] < histogram[prev];
  const atr        = calcATR(candles, INDICATOR_CONFIG.ATR_PERIOD);
  const { highs, lows } = findSwingLevels(candles, INDICATOR_CONFIG.SWING_LOOKBACK);
  const srAtr      = SIGNAL_CONFIG.SR_PROXIMITY_ATR;
  const nearSup    = lows.some(l  => Math.abs(closes[i] - l)  <= atr * srAtr);
  const nearRes    = highs.some(h => Math.abs(closes[i] - h) <= atr * srAtr);

  const items: ScoreItem[] = [];
  const reasons: string[] = [];
  let buyScore = 0;
  let sellScore = 0;

  const add = (name: string, b: number, s: number, max: number) => {
    buyScore += b;
    sellScore += s;
    items.push({ name, buyContrib: b, sellContrib: s, maxPossible: max });
  };
  const note = (text: string) => { if (collectReasons) reasons.push(text); };

  let bc = 0;
  let sc = 0;
  for (let j = Math.max(2, i - 4); j <= i; j++) {
    if (ema50[j - 1] <= ema200[j - 1] && ema50[j] > ema200[j]) bc = SCORE_WEIGHTS.EMA_CROSS;
    if (ema50[j - 1] >= ema200[j - 1] && ema50[j] < ema200[j]) sc = SCORE_WEIGHTS.EMA_CROSS;
  }
  add("EMA Cross", bc, sc, SCORE_WEIGHTS.EMA_CROSS);
  if (bc) note("EMA×↑");
  if (sc) note("EMA×↓");

  const emaTrendB = ema50[i] > ema200[i] ? SCORE_WEIGHTS.EMA_TREND : 0;
  const emaTrendS = ema50[i] < ema200[i] ? SCORE_WEIGHTS.EMA_TREND : 0;
  add("EMA Trend", emaTrendB, emaTrendS, SCORE_WEIGHTS.EMA_TREND);

  const priceB = closes[i] > ema50[i] && closes[i] > ema200[i] ? SCORE_WEIGHTS.PRICE_VS_EMA : 0;
  const priceS = closes[i] < ema50[i] && closes[i] < ema200[i] ? SCORE_WEIGHTS.PRICE_VS_EMA : 0;
  add("Price/EMA", priceB, priceS, SCORE_WEIGHTS.PRICE_VS_EMA);
  if (priceB) note("P>EMA");
  if (priceS) note("P<EMA");

  const macdB = macdBull
    ? SCORE_WEIGHTS.MACD
    : (!macdBull && histogram[i] > histogram[prev] ? SCORE_WEIGHTS.MACD_WEAK : 0);
  const macdS = macdBear
    ? SCORE_WEIGHTS.MACD
    : (!macdBear && histogram[i] < histogram[prev] ? SCORE_WEIGHTS.MACD_WEAK : 0);
  add("MACD", macdB, macdS, SCORE_WEIGHTS.MACD);
  if (macdBull) note("MACD↑");
  if (macdBear) note("MACD↓");

  let rsiB = 0;
  let rsiS = 0;
  if (currentRSI < RSI_CONFIG.OVERSOLD_STRONG) {
    rsiB = SCORE_WEIGHTS.RSI_STRONG;
  } else if (currentRSI < RSI_CONFIG.OVERSOLD_MODERATE) {
    rsiB = SCORE_WEIGHTS.RSI_MODERATE;
  }
  if (currentRSI > RSI_CONFIG.OVERBOUGHT_STRONG) {
    rsiS = SCORE_WEIGHTS.RSI_STRONG;
  } else if (currentRSI > RSI_CONFIG.OVERBOUGHT_MODERATE) {
    rsiS = SCORE_WEIGHTS.RSI_MODERATE;
  }
  add("RSI", rsiB, rsiS, SCORE_WEIGHTS.RSI_STRONG);
  if (rsiB || rsiS) note(`RSI${currentRSI.toFixed(0)}`);

  const volB = volConf && isBuyCan ? SCORE_WEIGHTS.VOLUME : 0;
  const volS = volConf && !isBuyCan ? SCORE_WEIGHTS.VOLUME : 0;
  add("Volume", volB, volS, SCORE_WEIGHTS.VOLUME);
  if (volB) note("Vol↑");
  if (volS) note("Vol↓");

  let patB = 0;
  let patS = 0;
  if (pattern === "bullish_engulfing" || pattern === "hammer") {
    patB = SCORE_WEIGHTS.PATTERN;
    note(pattern === "hammer" ? "Hammer" : "BullEng");
  }
  if (pattern === "bearish_engulfing" || pattern === "shooting_star") {
    patS = SCORE_WEIGHTS.PATTERN;
    note(pattern === "shooting_star" ? "ShootStar" : "BearEng");
  }
  if (pattern === "doji") {
    patB = SCORE_WEIGHTS.PATTERN_WEAK;
    patS = SCORE_WEIGHTS.PATTERN_WEAK;
  }
  add("Pattern", patB, patS, SCORE_WEIGHTS.PATTERN);

  const htfB = htfTrend === "bullish" ? SCORE_WEIGHTS.HTF_TREND : 0;
  const htfS = htfTrend === "bearish" ? SCORE_WEIGHTS.HTF_TREND : 0;
  add("HTF Trend", htfB, htfS, SCORE_WEIGHTS.HTF_TREND);
  if (htfB) note("HTF↑");
  if (htfS) note("HTF↓");

  const lvlB = nearSup ? SCORE_WEIGHTS.KEY_LEVEL : 0;
  const lvlS = nearRes ? SCORE_WEIGHTS.KEY_LEVEL : 0;
  add("Key Level", lvlB, lvlS, SCORE_WEIGHTS.KEY_LEVEL);
  if (lvlB) note("@Sup");
  if (lvlS) note("@Res");

  const bias = buyScore > sellScore ? "BUY" : sellScore > buyScore ? "SELL" : "NEUTRAL";
  const top  = Math.max(buyScore, sellScore);

  return {
    buyScore, sellScore, items, bias,
    strength: classifyStrength(top),
    reasons, currentRSI, atr,
  };
}

export function calcScores(candles: Candle[], htfTrend: "bullish" | "bearish" | "neutral"): ScoreBreakdown {
  const empty: ScoreBreakdown = { buyScore: 0, sellScore: 0, items: [], bias: "NEUTRAL", strength: "WEAK" };
  const result = computeScoreBreakdown(candles, htfTrend, false);
  if (!result) return empty;
  const { buyScore, sellScore, items, bias, strength } = result;
  return { buyScore, sellScore, items, bias, strength };
}

// ─────────────────────────────────────────────────────────────────────────────
//  detectSignals — revisi anti-deadlock
//
//  ROOT CAUSE 3 BUG LAMA yang menyebabkan tidak ada sinyal berjam-jam:
//
//  ❌ BUG 1: consecutive >= 3 → HARD BLOCK permanen
//     Di bearish market: 3 SELL → blocked, market tidak naik → BUY tidak muncul
//     → tidak ada yang unlock → DEADLOCK SELAMANYA
//     FIX: Tidak ada hard block. Consecutive hanya menambah extra score requirement.
//
//  ❌ BUG 2: price separation atr * 1.5 terlalu besar
//     Di sideways market ATR $200 → butuh $300 pergerakan → TIDAK PERNAH TERPENUHI
//     FIX: Ganti ke atr * 0.3 → harga hanya perlu bergerak sedikit dari entry lama
//
//  ❌ BUG 3: area penalty + consecutive numpuk
//     buyMin = 2 + 0.5 (area) + 1.5 (consec) = 4.0 → hampir mustahil di 1m
//     FIX: Hapus area penalty. S/R hanya bonus, bukan hukuman.
// ─────────────────────────────────────────────────────────────────────────────
export function detectSignals(
  candles      : Candle[],
  prevSignalTime: number,
  htfTrend     : "bullish" | "bearish" | "neutral",
  activeSignals: Signal[],
  recentSignals: Signal[] = []
): Signal | null {

  if (activeSignals.length > 0) return null;

  const score = computeScoreBreakdown(candles, htfTrend, true);
  if (!score) return null;

  const { buyScore, sellScore, reasons, currentRSI, atr } = score;
  const lastCandle     = candles[candles.length - 1];
  const candleDuration = candles.length >= 2 ? candles[1].time - candles[0].time : 60_000;
  const entry          = lastCandle.close;

  const cooldownMs = getSignalCooldownMs(candleDuration);
  if (lastCandle.time - prevSignalTime < cooldownMs) return null;

  const lastClosed = recentSignals.find(s => s.status !== "active");
  if (lastClosed) {
    const dist = Math.abs(entry - lastClosed.price);
    if (dist < atr * SIGNAL_CONFIG.PRICE_SEPARATION_ATR_MULTIPLIER) return null;
  }

  const last5 = recentSignals.filter(s => s.status !== "active").slice(0, 5);
  const getStreak = (dir: "BUY" | "SELL") => {
    let n = 0;
    for (const s of last5) { if (s.type === dir) n++; else break; }
    return n;
  };
  const streakBuy  = getStreak("BUY");
  const streakSell = getStreak("SELL");
  const { STREAK_PENALTY_PER_SIGNAL, MAX_STREAK_PENALTY } = SIGNAL_CONFIG;

  const extraBuy  = streakBuy  >= 2
    ? Math.min(streakBuy  - 1, MAX_STREAK_PENALTY) * STREAK_PENALTY_PER_SIGNAL : 0;
  const extraSell = streakSell >= 2
    ? Math.min(streakSell - 1, MAX_STREAK_PENALTY) * STREAK_PENALTY_PER_SIGNAL : 0;

  const tfKey    = candleDurationToTfKey(candleDuration);
  const baseMin  = SIGNAL_CONFIG.BASE_THRESHOLD[tfKey] ?? 3;
  const buyMin   = baseMin + extraBuy;
  const sellMin  = baseMin + extraSell;
  const edge     = SIGNAL_CONFIG.SIGNAL_EDGE;

  if (buyScore >= buyMin && buyScore > sellScore + edge && currentRSI < SIGNAL_CONFIG.RSI_BUY_MAX) {
    return {
      type:   "BUY",
      price:  entry,
      sl:     entry - atr * SIGNAL_CONFIG.SL_MULTIPLIER,
      tp:     entry + atr * SIGNAL_CONFIG.TP_MULTIPLIER,
      rsi:    currentRSI,
      reason: reasons.join(" • "),
      time:   lastCandle.time,
      status: "active",
    };
  }

  if (sellScore >= sellMin && sellScore > buyScore + edge && currentRSI > SIGNAL_CONFIG.RSI_SELL_MIN) {
    return {
      type:   "SELL",
      price:  entry,
      sl:     entry + atr * SIGNAL_CONFIG.SL_MULTIPLIER,
      tp:     entry - atr * SIGNAL_CONFIG.TP_MULTIPLIER,
      rsi:    currentRSI,
      reason: reasons.join(" • "),
      time:   lastCandle.time,
      status: "active",
    };
  }

  return null;
}
