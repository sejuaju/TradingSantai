import type { Candle } from "@/components/terminal/types";

/** Jumlah bar demo untuk TS SMC (H1 bias + sweep lookback) */
export const SMC_DEMO_BAR_COUNT = 600;

/** Generate deterministic demo candles for offline backtest */
export function generateDemoCandles(count = 200, seed = 42): Candle[] {
  const candles: Candle[] = [];
  let price = 1.085;
  let t = Date.now() - count * 300_000;

  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < count; i++) {
    const drift = (rnd() - 0.48) * 0.0012;
    const open = price;
    const close = price + drift;
    const wick = Math.abs(drift) + rnd() * 0.0008;
    const high = Math.max(open, close) + wick * rnd();
    const low = Math.min(open, close) - wick * rnd();
    const volume = 500 + Math.floor(rnd() * 2000);

    candles.push({ open, high, low, close, volume, time: t });
    price = close;
    t += 300_000;
  }

  return candles;
}

/** Data demo khusus SMC — uses structured seed for backtest engine */
export function generateSmcDemoCandles(count = SMC_DEMO_BAR_COUNT): Candle[] {
  return generateDemoCandles(count, 42);
}

export function smcDemoCandles(count = SMC_DEMO_BAR_COUNT): Candle[] {
  return generateSmcDemoCandles(count);
}