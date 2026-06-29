import { Candle, Signal } from "./types";
import { INDICATOR_CONFIG } from "./config";

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
export const MAX_SCORE = 12.5;

export function calcScores(candles: Candle[], htfTrend: "bullish"|"bearish"|"neutral"): ScoreBreakdown {
  const empty: ScoreBreakdown = { buyScore:0, sellScore:0, items:[], bias:"NEUTRAL", strength:"WEAK" };
  if (candles.length < 30) return empty;
  const closes = candles.map(c => c.close);
  const ema9 = calcEMA(closes, 9), ema21 = calcEMA(closes, 21);
  const rsi  = calcRSI(closes);
  const { histogram } = calcMACD(closes);
  const len = closes.length, i = len - 1, prev = len - 2;
  if (prev < 1) return empty;
  const currentRSI = rsi[i];
  const volConf    = isVolumeConfirmed(candles, i);
  const isBuyCan   = candles[i].close >= candles[i].open;
  const pattern    = detectCandlePattern(candles, i);
  const macdBull   = histogram[i] > 0 && histogram[i] > histogram[prev];
  const macdBear   = histogram[i] < 0 && histogram[i] < histogram[prev];
  const atr        = calcATR(candles, 14);
  const { highs, lows } = findSwingLevels(candles, 80);
  const nearSup = lows.some(l  => Math.abs(closes[i] - l)  <= atr * 0.8);
  const nearRes = highs.some(h => Math.abs(closes[i] - h) <= atr * 0.8);
  const items: ScoreItem[] = [];
  let buyScore = 0, sellScore = 0;
  const add = (name: string, b: number, s: number, max: number) => {
    buyScore += b; sellScore += s;
    items.push({ name, buyContrib: b, sellContrib: s, maxPossible: max });
  };
  let bc = 0, sc = 0;
  for (let j = Math.max(2, i - 4); j <= i; j++) {
    if (ema9[j-1] <= ema21[j-1] && ema9[j] > ema21[j]) bc = 2;
    if (ema9[j-1] >= ema21[j-1] && ema9[j] < ema21[j]) sc = 2;
  }
  add("EMA Cross", bc, sc, 2);
  add("EMA Trend", ema9[i]>ema21[i]?1:0, ema9[i]<ema21[i]?1:0, 1);
  add("Price/EMA", (closes[i]>ema9[i]&&closes[i]>ema21[i])?1:0, (closes[i]<ema9[i]&&closes[i]<ema21[i])?1:0, 1);
  add("MACD",
    macdBull?1:(!macdBull&&histogram[i]>histogram[prev]?0.5:0),
    macdBear?1:(!macdBear&&histogram[i]<histogram[prev]?0.5:0), 1);
  add("RSI", currentRSI<30?2:currentRSI<40?1:0, currentRSI>70?2:currentRSI>60?1:0, 2);
  add("Volume", (volConf&&isBuyCan)?1:0, (volConf&&!isBuyCan)?1:0, 1);
  add("Pattern",
    (pattern==="bullish_engulfing"||pattern==="hammer")?2:pattern==="doji"?0.5:0,
    (pattern==="bearish_engulfing"||pattern==="shooting_star")?2:pattern==="doji"?0.5:0, 2);
  add("HTF Trend", htfTrend==="bullish"?1.5:0, htfTrend==="bearish"?1.5:0, 1.5);
  add("Key Level", nearSup?1:0, nearRes?1:0, 1);
  const bias = buyScore>sellScore?"BUY":sellScore>buyScore?"SELL":"NEUTRAL";
  const top  = Math.max(buyScore, sellScore);
  return { buyScore, sellScore, items, bias, strength: top>=6?"STRONG":top>=3?"MODERATE":"WEAK" };
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

  if (candles.length < 30) return null;
  if (activeSignals.length > 0) return null;

  const closes = candles.map(c => c.close);
  const ema9   = calcEMA(closes, 9);
  const ema21  = calcEMA(closes, 21);
  const rsi    = calcRSI(closes);
  const { histogram } = calcMACD(closes);

  const len  = closes.length;
  const i    = len - 1;
  const prev = len - 2;
  if (prev < 1) return null;

  const lastCandle     = candles[i];
  const candleDuration = candles.length >= 2 ? candles[1].time - candles[0].time : 60_000;
  const atr            = calcATR(candles, 14);

  // ── Cooldown ──────────────────────────────────────────────────────────────
  const cooldownMs =
    candleDuration <= 60_000  ? Math.max(candleDuration * 2, 90_000)
  : candleDuration <= 300_000 ? Math.max(candleDuration * 3, 180_000)
  :                             Math.max(candleDuration * 5, 180_000);
  if (lastCandle.time - prevSignalTime < cooldownMs) return null;

  // ── FIX BUG 2: Price separation — dikurangi ke 0.3× ATR ──────────────────
  // Hanya cegah re-entry di candle yang SAMA atau harga yang SAMA PERSIS
  // Tidak perlu $300 separation — cukup sedikit bergerak dari entry lama
  const lastClosed = recentSignals.find(s => s.status !== "active");
  if (lastClosed) {
    const dist = Math.abs(closes[i] - lastClosed.price);
    if (dist < atr * 0.3) return null; // hanya skip jika harga hampir sama persis
  }

  // ── FIX BUG 1: Consecutive direction — TIDAK ada hard block ──────────────
  // Hanya tambah extra score requirement, tidak pernah blocked total
  const last5 = recentSignals.filter(s => s.status !== "active").slice(0, 5);
  const getStreak = (dir: "BUY" | "SELL") => {
    let n = 0;
    for (const s of last5) { if (s.type === dir) n++; else break; }
    return n;
  };
  const streakBuy  = getStreak("BUY");
  const streakSell = getStreak("SELL");

  // Extra score berdasarkan streak — semakin panjang semakin butuh konfirmasi kuat
  // Tidak ada hard block, hanya threshold naik
  const extraBuy  = streakBuy  >= 2 ? Math.min(streakBuy  - 1, 3) * 0.8 : 0;
  const extraSell = streakSell >= 2 ? Math.min(streakSell - 1, 3) * 0.8 : 0;

  // ── Swing levels — bonus saja, TIDAK ada penalty ──────────────────────────
  const { highs: swingHighs, lows: swingLows } = findSwingLevels(candles, 80);
  const nearSupport    = swingLows.some(l  => Math.abs(closes[i] - l)  <= atr * 0.8);
  const nearResistance = swingHighs.some(h => Math.abs(closes[i] - h) <= atr * 0.8);

  // ── Scoring ───────────────────────────────────────────────────────────────
  const currentRSI = rsi[i];
  const volConf    = isVolumeConfirmed(candles, i);
  const isBuyCan   = candles[i].close >= candles[i].open;
  const pattern    = detectCandlePattern(candles, i) ?? detectCandlePattern(candles, i - 1);
  const macdBull   = histogram[i] > 0 && histogram[i] > histogram[prev];
  const macdBear   = histogram[i] < 0 && histogram[i] < histogram[prev];

  let buyScore = 0, sellScore = 0;
  const reasons: string[] = [];

  // 1. EMA Cross (5 candles terakhir)
  let bullCross = false, bearCross = false;
  for (let j = Math.max(2, i - 4); j <= i; j++) {
    if (ema9[j-1] <= ema21[j-1] && ema9[j] > ema21[j]) bullCross = true;
    if (ema9[j-1] >= ema21[j-1] && ema9[j] < ema21[j]) bearCross = true;
  }
  if (bullCross) { buyScore  += 2; reasons.push("EMA×↑"); }
  if (bearCross) { sellScore += 2; reasons.push("EMA×↓"); }

  // 2. EMA Trend
  if (ema9[i] > ema21[i]) buyScore  += 1;
  if (ema9[i] < ema21[i]) sellScore += 1;

  // 3. Price vs EMA
  if (closes[i] > ema9[i] && closes[i] > ema21[i]) { buyScore  += 1; reasons.push("P>EMA"); }
  if (closes[i] < ema9[i] && closes[i] < ema21[i]) { sellScore += 1; reasons.push("P<EMA"); }

  // 4. MACD
  if (macdBull)  { buyScore  += 1;   reasons.push("MACD↑"); }
  if (macdBear)  { sellScore += 1;   reasons.push("MACD↓"); }
  if (!macdBull && histogram[i] > histogram[prev]) buyScore  += 0.5;
  if (!macdBear && histogram[i] < histogram[prev]) sellScore += 0.5;

  // 5. RSI
  if      (currentRSI < 30) { buyScore  += 2; reasons.push(`RSI${currentRSI.toFixed(0)}`); }
  else if (currentRSI < 40) { buyScore  += 1; reasons.push(`RSI${currentRSI.toFixed(0)}`); }
  if      (currentRSI > 70) { sellScore += 2; reasons.push(`RSI${currentRSI.toFixed(0)}`); }
  else if (currentRSI > 60) { sellScore += 1; reasons.push(`RSI${currentRSI.toFixed(0)}`); }

  // 6. Volume directional
  if (volConf) {
    if (isBuyCan)  { buyScore  += 1; reasons.push("Vol↑"); }
    else           { sellScore += 1; reasons.push("Vol↓"); }
  }

  // 7. Pattern
  if (pattern === "bullish_engulfing" || pattern === "hammer") {
    buyScore  += 2; reasons.push(pattern === "hammer" ? "Hammer" : "BullEng");
  }
  if (pattern === "bearish_engulfing" || pattern === "shooting_star") {
    sellScore += 2; reasons.push(pattern === "shooting_star" ? "ShootStar" : "BearEng");
  }
  if (pattern === "doji") { buyScore += 0.5; sellScore += 0.5; }

  // 8. HTF
  if (htfTrend === "bullish") { buyScore  += 1.5; reasons.push("HTF↑"); }
  if (htfTrend === "bearish") { sellScore += 1.5; reasons.push("HTF↓"); }

  // 9. Key Level bonus (TIDAK ada penalty jika tidak di level)
  if (nearSupport)    { buyScore  += 1; reasons.push("@Sup"); }
  if (nearResistance) { sellScore += 1; reasons.push("@Res"); }

  // ── FIX BUG 3: MIN_SCORE tanpa area penalty ───────────────────────────────
  const BASE_SCORE =
    candleDuration <= 60_000  ? 2
  : candleDuration <= 300_000 ? 2.5
  :                             3;

  // Extra score hanya dari streak (tidak dari area)
  const buyMin  = BASE_SCORE + extraBuy;
  const sellMin = BASE_SCORE + extraSell;

  const entry = closes[i];

  // ── Generate Signal ───────────────────────────────────────────────────────
  if (buyScore >= buyMin && buyScore > sellScore + 0.5 && currentRSI < 78) {
    return {
      type:   "BUY",
      price:  entry,
      sl:     entry - atr * 1.5,
      tp:     entry + atr * 2.5,
      rsi:    currentRSI,
      reason: reasons.join(" • "),
      time:   lastCandle.time,
      status: "active",
    };
  }

  if (sellScore >= sellMin && sellScore > buyScore + 0.5 && currentRSI > 22) {
    return {
      type:   "SELL",
      price:  entry,
      sl:     entry + atr * 1.5,
      tp:     entry - atr * 2.5,
      rsi:    currentRSI,
      reason: reasons.join(" • "),
      time:   lastCandle.time,
      status: "active",
    };
  }

  return null;
}
