import type { Candle, Signal } from "@/components/terminal/types";
import { calcATR } from "@/components/terminal/indicators";
import {
  aggregateToH1,
  highest,
  hourUtc,
  lowest,
  M5_MS,
  seriesFrom,
} from "./candleUtils";
import {
  DEFAULT_SMC_INPUTS,
  emptyTrigger,
  emptyZone,
  type FvgCheck,
  type SmcBias,
  type SmcEntryZone,
  type SmcInputs,
  type SmcState,
  type SmcTrigger,
  zoneReady,
} from "./types";

const BULL = 1;
const BEAR = -1;
const PIP = 0.0001;

export const SMC_ENGINE_VERSION = "1.50";
export const SMC_MIN_BARS = 300;

function pipVal(pips: number): number {
  return pips * PIP;
}

function isSessionActive(timeMs: number, inp: SmcInputs): boolean {
  if (!inp.useSession) return true;
  const h = hourUtc(timeMs);
  return h >= inp.sessionStart && h < inp.sessionEnd;
}

function getH1Bias(candles: Candle[], m5Idx: number, inp: SmcInputs): SmcBias {
  const h1 = aggregateToH1(candles, m5Idx);
  if (h1.length < inp.h1SwingLen) return "NONE";

  const slice = h1.slice(-inp.h1SwingLen);
  const rangeHigh = highest(slice.map((c) => c.high));
  const rangeLow = lowest(slice.map((c) => c.low));
  const range = rangeHigh - rangeLow;
  if (range <= 0) return "NONE";

  const lastClose = h1[h1.length - 1].close;
  const pos = (lastClose - rangeLow) / range;

  if (pos >= 1 - inp.pdZoneRatio) return "SELL";
  if (pos <= inp.pdZoneRatio) return "BUY";
  return "NONE";
}

function getAtrAt(candles: Candle[], endIdx: number, period: number, shift: number): number {
  const sliceEnd = endIdx - shift + 2;
  if (sliceEnd < period + 1) return 0;
  return calcATR(candles.slice(0, sliceEnd), period);
}

function checkSweep(
  candles: Candle[],
  m5Idx: number,
  bias: SmcBias,
  inp: SmcInputs,
): { ok: boolean; level: number } {
  const sz = inp.sweepLookback + 5;
  const { highs, lows, closes } = seriesFrom(candles, m5Idx, sz);
  if (highs.length < 3) return { ok: false, level: 0 };

  const candH = highs[0];
  const candL = lows[0];
  const candC = closes[0];

  for (let k = 1; k < inp.sweepLookback && k + 1 < highs.length; k++) {
    const lvl = bias === "BUY" ? lows[k] : highs[k];
    let isEqual = false;

    for (let m = k + 1; m <= Math.min(k + 10, inp.sweepLookback) && m < highs.length; m++) {
      const cmp = bias === "BUY" ? lows[m] : highs[m];
      if (Math.abs(cmp - lvl) <= pipVal(inp.equalHlPips)) {
        isEqual = true;
        break;
      }
    }

    const swept =
      bias === "BUY"
        ? candL < lvl && candC > lvl
        : candH > lvl && candC < lvl;

    if (swept && (isEqual || k <= 4)) {
      return { ok: true, level: lvl };
    }
  }

  return { ok: false, level: 0 };
}

function checkDisplacement(
  candles: Candle[],
  m5Idx: number,
  bias: SmcBias,
  inp: SmcInputs,
): { ok: boolean; high: number; low: number; bar: number; time: number } {
  const atr = getAtrAt(candles, m5Idx, 14, 1);
  if (atr <= 0) return { ok: false, high: 0, low: 0, bar: 0, time: 0 };

  const threshold = atr * inp.displFactor;
  const { highs, lows, opens, closes, times } = seriesFrom(candles, m5Idx, 5);
  if (highs.length < 3) return { ok: false, high: 0, low: 0, bar: 0, time: 0 };

  for (let k = 0; k < 3 && k < highs.length; k++) {
    const body = Math.abs(closes[k] - opens[k]);
    if (body < threshold) continue;

    const bullC = closes[k] > opens[k];
    const bearC = closes[k] < opens[k];

    if (bias === "BUY" && bullC) {
      return { ok: true, high: highs[k], low: lows[k], bar: k + 1, time: times[k] };
    }
    if (bias === "SELL" && bearC) {
      return { ok: true, high: highs[k], low: lows[k], bar: k + 1, time: times[k] };
    }
  }

  return { ok: false, high: 0, low: 0, bar: 0, time: 0 };
}

function checkMSS(
  candles: Candle[],
  m5Idx: number,
  bias: SmcBias,
  displHigh: number,
  displLow: number,
  inp: SmcInputs,
): { ok: boolean; level: number } {
  const lookback = inp.swingLenTrig + 5;
  const { highs, lows, closes } = seriesFrom(candles, m5Idx, lookback);
  if (closes.length < 3) return { ok: false, level: 0 };

  if (bias === "BUY") {
    let swH = 0;
    for (let k = 1; k < inp.swingLenTrig && k + 1 < highs.length; k++) {
      if (highs[k] > highs[k - 1] && highs[k] > highs[k + 1] && highs[k] < displHigh) {
        swH = highs[k];
        break;
      }
    }
    if (swH <= 0) swH = displHigh;
    if (closes[0] > swH) return { ok: true, level: swH };
  } else if (bias === "SELL") {
    let swL = Number.MAX_VALUE;
    for (let k = 1; k < inp.swingLenTrig && k + 1 < lows.length; k++) {
      if (lows[k] < lows[k - 1] && lows[k] < lows[k + 1] && lows[k] > displLow) {
        swL = lows[k];
        break;
      }
    }
    if (swL === Number.MAX_VALUE) swL = displLow;
    if (closes[0] < swL) return { ok: true, level: swL };
  }

  return { ok: false, level: 0 };
}

function findDisplFVG(
  candles: Candle[],
  m5Idx: number,
  bias: SmcBias,
  displTime: number,
): { ok: boolean; top: number; bot: number } {
  const total = 30;
  const { highs, lows, times } = seriesFrom(candles, m5Idx, total);
  if (times.length < 5) return { ok: false, top: 0, bot: 0 };

  let d = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i] === displTime) {
      d = i;
      break;
    }
  }

  if (d < 0) {
    for (let i = 0; i < times.length; i++) {
      if (Math.abs(times[i] - displTime) <= M5_MS * 2) {
        d = i;
        break;
      }
    }
  }

  if (d < 1 || d + 1 >= times.length) return { ok: false, top: 0, bot: 0 };

  if (bias === "BUY") {
    if (lows[d - 1] > highs[d + 1]) {
      const bot = highs[d + 1];
      const top = lows[d - 1];
      if (top - bot >= pipVal(1)) return { ok: true, top, bot };
    }
  } else if (bias === "SELL") {
    if (highs[d - 1] < lows[d + 1]) {
      const top = lows[d + 1];
      const bot = highs[d - 1];
      if (top - bot >= pipVal(1)) return { ok: true, top, bot };
    }
  }

  return { ok: false, top: 0, bot: 0 };
}

function findIFVG(
  candles: Candle[],
  m5Idx: number,
  bias: SmcBias,
  displTime: number,
  displHigh: number,
  displLow: number,
  inp: SmcInputs,
): { ok: boolean; top: number; bot: number } {
  if (!inp.allowIfvg) return { ok: false, top: 0, bot: 0 };

  const total = 50;
  const { highs, lows, times } = seriesFrom(candles, m5Idx, total);
  if (times.length < 5) return { ok: false, top: 0, bot: 0 };

  let displIdx = -1;
  for (let i = 0; i < times.length; i++) {
    if (times[i] === displTime) {
      displIdx = i;
      break;
    }
  }
  if (displIdx < 0) return { ok: false, top: 0, bot: 0 };

  if (bias === "BUY") {
    for (let i = displIdx + 2; i < times.length - 1; i++) {
      if (highs[i - 1] < lows[i + 1]) {
        const ifvgTop = lows[i + 1];
        const ifvgBot = highs[i - 1];
        if (ifvgTop < displHigh && displLow > ifvgBot && ifvgTop - ifvgBot >= pipVal(1)) {
          return { ok: true, top: ifvgTop, bot: ifvgBot };
        }
      }
    }
  } else if (bias === "SELL") {
    for (let i = displIdx + 2; i < times.length - 1; i++) {
      if (lows[i - 1] > highs[i + 1]) {
        const ifvgBot = highs[i + 1];
        const ifvgTop = lows[i - 1];
        if (ifvgBot > displLow && displHigh < ifvgTop && ifvgTop - ifvgBot >= pipVal(1)) {
          return { ok: true, top: ifvgTop, bot: ifvgBot };
        }
      }
    }
  }

  return { ok: false, top: 0, bot: 0 };
}

function checkFVGReturn(
  candles: Candle[],
  m5Idx: number,
  bias: SmcBias,
  zone: SmcEntryZone,
  inp: SmcInputs,
): FvgCheck {
  if (!zoneReady(zone)) return "NOT_YET";

  const buf = pipVal(inp.fvgEntryBuffer);
  const bar = candles[m5Idx];
  const ask = bar.close;
  const bid = bar.close;

  if (inp.fvgMustHold) {
    const { closes } = seriesFrom(candles, m5Idx, 3);
    if (bias === "BUY") {
      for (let i = 0; i < closes.length; i++) {
        if (closes[i] < zone.bot - buf) return "INVALIDATED";
      }
    } else if (bias === "SELL") {
      for (let i = 0; i < closes.length; i++) {
        if (closes[i] > zone.top + buf) return "INVALIDATED";
      }
    }
  }

  if (bias === "BUY") {
    if (ask <= zone.top + buf && ask >= zone.bot - buf) return "ENTERED";
  } else if (bias === "SELL") {
    if (bid >= zone.bot - buf && bid <= zone.top + buf) return "ENTERED";
  }

  return "NOT_YET";
}

function buildEntrySignal(
  bias: SmcBias,
  trig: SmcTrigger,
  zone: SmcEntryZone,
  entryPrice: number,
  time: number,
  inp: SmcInputs,
): Signal | null {
  let sl = 0;
  let tp = 0;

  if (bias === "BUY") {
    const slBase = Math.min(zone.bot, trig.sweepLevel);
    sl = slBase - pipVal(inp.slBufferPips);
    if (entryPrice <= sl) return null;
    tp = entryPrice + (entryPrice - sl) * inp.rrRatio;
  } else if (bias === "SELL") {
    const slBase = Math.max(zone.top, trig.sweepLevel);
    sl = slBase + pipVal(inp.slBufferPips);
    if (entryPrice >= sl) return null;
    tp = entryPrice - (sl - entryPrice) * inp.rrRatio;
  } else {
    return null;
  }

  const zoneLabel = zone.isIFVG ? "IFVG" : "FVG";

  return {
    type: bias === "BUY" ? "BUY" : "SELL",
    price: entryPrice,
    sl,
    tp,
    rsi: 50,
    reason: `SMC v${SMC_ENGINE_VERSION} • Sweep→Displ→MSS→${zoneLabel}`,
    time,
    status: "active",
  };
}

function tradeStillOpen(signal: Signal, candles: Candle[], fromIdx: number): boolean {
  for (let i = fromIdx; i < candles.length; i++) {
    const c = candles[i];
    const hitSl =
      signal.type === "BUY" ? c.low <= signal.sl : c.high >= signal.sl;
    const hitTp =
      signal.type === "BUY" ? c.high >= signal.tp : c.low <= signal.tp;
    if (hitSl || hitTp) return false;
  }
  return true;
}

interface EngineState {
  h1Bias: SmcBias;
  state: SmcState;
  trig: SmcTrigger;
  zone: SmcEntryZone;
  lastBarTime: number;
  lastH1Bucket: number;
  noDisplCnt: number;
  noMSSCnt: number;
  openSignal: Signal | null;
  openFromIdx: number;
}

function resetToSweep(st: EngineState, _reason: string) {
  st.noDisplCnt = 0;
  st.noMSSCnt = 0;
  st.trig = emptyTrigger();
  st.zone = emptyZone();
  st.state = "WAIT_SWEEP";
}

/**
 * Port TS_SMC_EA v1.50 — state machine lengkap dari referensi .mq5
 * H1 Bias → Sweep → Displacement → MSS → FVG/IFVG return → Entry
 */
export function runSmcEngine(
  candles: Candle[],
  inputs: SmcInputs = DEFAULT_SMC_INPUTS,
): Signal[] {
  if (candles.length < SMC_MIN_BARS) return [];

  const signals: Signal[] = [];
  const st: EngineState = {
    h1Bias: "NONE",
    state: "WAIT_SWEEP",
    trig: emptyTrigger(),
    zone: emptyZone(),
    lastBarTime: -1,
    lastH1Bucket: -1,
    noDisplCnt: 0,
    noMSSCnt: 0,
    openSignal: null,
    openFromIdx: -1,
  };

  for (let i = SMC_MIN_BARS; i < candles.length; i++) {
    const bar = candles[i];
    if (bar.time === st.lastBarTime) continue;
    st.lastBarTime = bar.time;

    const h1Bucket = Math.floor(bar.time / (M5_MS * 12));
    if (h1Bucket !== st.lastH1Bucket) {
      st.lastH1Bucket = h1Bucket;
      st.h1Bias = getH1Bias(candles, i, inputs);
    }

    if (st.openSignal) {
      if (!tradeStillOpen(st.openSignal, candles, st.openFromIdx + 1)) {
        st.openSignal = null;
        resetToSweep(st, "Trade selesai");
      } else {
        st.state = "IN_TRADE";
        continue;
      }
    }

    if (signals.length >= inputs.maxTrades * 50) break;

    if (!isSessionActive(bar.time, inputs)) {
      if (st.trig.sweepDone) resetToSweep(st, "Di luar sesi");
      continue;
    }

    const newBias = getH1Bias(candles, i, inputs);
    if (newBias !== st.h1Bias) {
      st.h1Bias = newBias;
      resetToSweep(st, "Bias berubah");
    }
    if (st.h1Bias === "NONE") continue;

    switch (st.state) {
      case "WAIT_SWEEP": {
        const sweep = checkSweep(candles, i, st.h1Bias, inputs);
        if (sweep.ok) {
          st.trig.sweepDone = true;
          st.trig.sweepLevel = sweep.level;
          st.trig.bias = st.h1Bias === "BUY" ? BULL : BEAR;
          st.state = "WAIT_DISPL";
        }
        break;
      }

      case "WAIT_DISPL": {
        const displ = checkDisplacement(candles, i, st.h1Bias, inputs);
        if (displ.ok) {
          st.trig.displDone = true;
          st.trig.displHigh = displ.high;
          st.trig.displLow = displ.low;
          st.trig.displBar = displ.bar;
          st.trig.displTime = displ.time;
          st.noDisplCnt = 0;
          st.state = "WAIT_MSS";
        } else {
          st.noDisplCnt++;
          if (st.noDisplCnt > 10) resetToSweep(st, "Displacement timeout");
        }
        break;
      }

      case "WAIT_MSS": {
        const mss = checkMSS(
          candles,
          i,
          st.h1Bias,
          st.trig.displHigh,
          st.trig.displLow,
          inputs,
        );
        if (mss.ok) {
          st.trig.mssDone = true;
          st.trig.mssBreakLevel = mss.level;
          st.trig.trigTime = bar.time;
          st.noMSSCnt = 0;

          let zTop = 0;
          let zBot = 0;
          let found = false;
          let isIFVG = false;

          const fvg = findDisplFVG(candles, i, st.h1Bias, st.trig.displTime);
          if (fvg.ok) {
            zTop = fvg.top;
            zBot = fvg.bot;
            found = true;
          } else {
            const ifvg = findIFVG(
              candles,
              i,
              st.h1Bias,
              st.trig.displTime,
              st.trig.displHigh,
              st.trig.displLow,
              inputs,
            );
            if (ifvg.ok) {
              zTop = ifvg.top;
              zBot = ifvg.bot;
              found = true;
              isIFVG = true;
            }
          }

          if (found) {
            st.zone = {
              top: zTop,
              bot: zBot,
              isIFVG,
              valid: true,
              foundTime: bar.time,
              waitBars: 0,
            };
            st.state = "WAIT_FVG";
          } else {
            resetToSweep(st, "Tidak ada FVG/IFVG");
          }
        } else {
          st.noMSSCnt++;
          if (st.noMSSCnt > 8) resetToSweep(st, "MSS timeout");
        }
        break;
      }

      case "WAIT_FVG": {
        st.zone.waitBars++;

        if (inputs.fvgTimeout > 0 && st.zone.waitBars > inputs.fvgTimeout) {
          resetToSweep(st, "FVG return timeout");
          break;
        }

        const status = checkFVGReturn(candles, i, st.h1Bias, st.zone, inputs);

        if (status === "INVALIDATED") {
          resetToSweep(st, "FVG invalidated");
        } else if (status === "ENTERED") {
          const sig = buildEntrySignal(
            st.h1Bias,
            st.trig,
            st.zone,
            bar.close,
            bar.time,
            inputs,
          );
          if (sig) {
            signals.push(sig);
            st.openSignal = sig;
            st.openFromIdx = i;
            st.state = "IN_TRADE";
            st.trig = emptyTrigger();
            st.zone = emptyZone();
          }
        }
        break;
      }

      case "IN_TRADE":
        break;
    }
  }

  return signals;
}