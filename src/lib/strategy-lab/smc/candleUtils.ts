import type { Candle } from "@/components/terminal/types";

export const M5_MS = 300_000;
export const M5_PER_H1 = 12;

/** Agregasi M5 → H1 sampai indeks M5 tertentu (inklusif). */
export function aggregateToH1(m5: Candle[], upToM5Idx: number): Candle[] {
  if (upToM5Idx < 0) return [];

  const buckets = new Map<number, Candle[]>();

  for (let i = 0; i <= upToM5Idx; i++) {
    const c = m5[i];
    const bucket = Math.floor(c.time / (M5_MS * M5_PER_H1));
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(c);
  }

  const keys = [...buckets.keys()].sort((a, b) => a - b);
  const h1: Candle[] = [];

  for (const key of keys) {
    const bars = buckets.get(key)!;
    h1.push({
      time: bars[0].time,
      open: bars[0].open,
      high: Math.max(...bars.map((b) => b.high)),
      low: Math.min(...bars.map((b) => b.low)),
      close: bars[bars.length - 1].close,
      volume: bars.reduce((s, b) => s + b.volume, 0),
    });
  }

  return h1;
}

/** Array series MT5: [0]=shift 1 (bar tertutup), [1]=shift 2, dst. */
export function seriesFrom(
  candles: Candle[],
  endIdx: number,
  count: number,
): { highs: number[]; lows: number[]; opens: number[]; closes: number[]; times: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];
  const opens: number[] = [];
  const closes: number[] = [];
  const times: number[] = [];

  for (let shift = 1; shift <= count; shift++) {
    const idx = endIdx - shift + 1;
    if (idx < 0) break;
    const c = candles[idx];
    highs.push(c.high);
    lows.push(c.low);
    opens.push(c.open);
    closes.push(c.close);
    times.push(c.time);
  }

  return { highs, lows, opens, closes, times };
}

export function highest(values: number[]): number {
  if (!values.length) return 0;
  return Math.max(...values);
}

export function lowest(values: number[]): number {
  if (!values.length) return 0;
  return Math.min(...values);
}

export function hourUtc(ms: number): number {
  return new Date(ms).getUTCHours();
}