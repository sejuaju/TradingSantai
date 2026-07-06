"use client";

import { useMemo, useState, useRef, useCallback, useEffect, Fragment } from "react";
import { Candle, Signal } from "./types";
import { TRADING_CONFIG, CHART_CONFIG, INDICATOR_CONFIG } from "./config";
import { calcEMA, calcRSI, calcMACD } from "./indicators";
import { CHART_LINES } from "./shared";

interface Props {
  candles: Candle[];
  signals: Signal[];
  viewKey?: string;
}

interface PlacedSignal {
  signal: Signal;
  candleIndex: number;
  x: number;
  entryY: number;
  wickY: number;
}

interface PlacedExitMarker {
  signal: Signal;
  x: number;
  exitY: number;
  kind: "TP" | "SL";
}

const MIN_VISIBLE = 12;
const MAX_VISIBLE = TRADING_CONFIG.MAX_CANDLES_BUFFER;
const DEFAULT_VISIBLE = TRADING_CONFIG.CANDLE_DISPLAY_COUNT;
const RIGHT_PADDING_RATIO        = 0.07;
const CHART_TOP_MARGIN           = 0.07;
const MAIN_PLOT_HEIGHT           = 0.61;
const MACD_PANEL_HEIGHT          = 0.12;
const RSI_PANEL_HEIGHT           = 0.10;
const VOL_PANEL_HEIGHT           = 0.10;
const PRICE_RANGE_PADDING        = 0.12;
const MIN_PRICE_ZOOM             = 0.25;
const MAX_PRICE_ZOOM             = 8;
const PRICE_DRAG_SENSITIVITY     = 0.00055;
const CHART_VERTICAL_PAN_RATIO   = 1;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

interface TimeTick { xPct: number; label: string; }

/**
 * Format label waktu di time-axis — adaptif berdasarkan TOTAL range yang terlihat.
 *
 * visibleRangeMs > 60 hari  → "Jun '25"   (zoom sangat jauh keluar)
 * visibleRangeMs > 2 hari   → "Jun 28"    (zoom sedang-jauh)
 * visibleRangeMs > 4 jam    → "28 14:30"  (zoom sedang)
 * otherwise                 → "14:30"     (zoom dekat / default)
 *
 * Saat scroll zoom OUT (lebih banyak candle), visibleRangeMs naik
 * → label otomatis switch dari jam → tanggal, seperti TradingView.
 */
function formatTimeLabel(time: number, visibleRangeMs: number): string {
  const d = new Date(time);
  if (visibleRangeMs >= 60 * 86_400_000)
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  if (visibleRangeMs >= 2 * 86_400_000)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (visibleRangeMs >= 4 * 3_600_000)
    return `${d.getDate()} ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/**
 * Format crosshair — selalu tampilkan jam+menit agar tepat,
 * tambahkan tanggal jika range > 1 hari.
 */
function formatCrosshairLabel(time: number, visibleRangeMs: number): string {
  const d = new Date(time);
  const t = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (visibleRangeMs >= 86_400_000)
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${t}`;
  return t;
}

function buildTimeTicks(
  visibleCandles: Candle[],
  candleX: (i: number) => number,
  chartAreaW: number,
): TimeTick[] {
  const n = visibleCandles.length;
  if (n === 0) return [];

  // Total range waktu yang terlihat — dipakai untuk memilih format label
  const visibleRangeMs = n >= 2
    ? visibleCandles[n - 1].time - visibleCandles[0].time
    : 60_000;

  const target = clamp(Math.floor(n / 10), 4, 7);
  const step   = Math.max(1, Math.floor(n / target));
  const raw: TimeTick[] = [];
  for (let i = 0; i < n; i += step) {
    raw.push({
      xPct:  (candleX(i) / chartAreaW) * 100,
      label: formatTimeLabel(visibleCandles[i].time, visibleRangeMs),
    });
  }
  const last     = n - 1;
  const lastXPct = (candleX(last) / chartAreaW) * 100;
  const lastLbl  = formatTimeLabel(visibleCandles[last].time, visibleRangeMs);
  if (!raw.length || Math.abs(raw[raw.length - 1].xPct - lastXPct) > 0.5)
    raw.push({ xPct: lastXPct, label: lastLbl });

  const minGap = 9;
  const out: TimeTick[] = [];
  let prev = -minGap;
  for (const tick of raw) {
    if (tick.xPct - prev >= minGap) { out.push(tick); prev = tick.xPct; }
  }
  if (out.length === 0 || out[out.length - 1].xPct < lastXPct - 2) {
    const tail = out[out.length - 1];
    if (!tail || lastXPct - tail.xPct >= minGap * 0.65)
      out.push({ xPct: lastXPct, label: lastLbl });
  }
  return out;
}

function findCandleIndex(candles: Candle[], signalTime: number): number {
  const exact = candles.findIndex((c) => c.time === signalTime);
  if (exact >= 0) return exact;
  let best = -1, bestDiff = Infinity;
  for (let i = 0; i < candles.length; i++) {
    const diff = Math.abs(candles[i].time - signalTime);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return best;
}

/**
 * MODEL SCROLL — RIGHT-ANCHORED (sama seperti TradingView):
 *
 *  scrollOffset < 0 → candle live di KIRI, future space di KANAN
 *                     (drag KIRI → scrollOffset turun → candle geser KIRI)
 *  scrollOffset = 0 → live edge, candle terbaru di ujung kanan plotWidth
 *  scrollOffset > 0 → history: drag KANAN → scrollOffset naik → candle lama
 *                     muncul dari sisi KIRI
 *
 *  candleX(i) = plotWidth + (i - slotCount + 0.5 + effectiveShift) * candleW
 *    effectiveShift = scrollOffset          (scrollOffset <= 0, continuous)
 *                   = frac(scrollOffset)    (scrollOffset > 0, smooth integer-crossing)
 */
function minScrollOffset(visibleCount: number): number {
  return -(visibleCount - MIN_VISIBLE);
}
function maxScrollOffset(candleCount: number, visibleCount: number): number {
  return Math.max(0, candleCount - Math.min(visibleCount, candleCount));
}
function clampScrollOffset(s: number, candleCount: number, visibleCount: number): number {
  return clamp(s, minScrollOffset(visibleCount), maxScrollOffset(candleCount, visibleCount));
}

interface PanState { historyPanInt: number; visualShift: number; }

function resolveScrollState(scrollOffset: number): PanState {
  if (scrollOffset <= 0)
    return { historyPanInt: 0, visualShift: scrollOffset };
  return {
    historyPanInt: Math.floor(scrollOffset),
    visualShift:   scrollOffset - Math.floor(scrollOffset),
  };
}

function isActiveSignal(s: Signal["status"]) { return s === "active"; }
function signalMarkerOpacity(s: Signal["status"]): number {
  if (s === "active") return 1;
  if (s === "win")    return 0.72;
  return 0.62;
}
const CLOSED_LINE_OPACITY = 0.28;
const CLOSED_EXIT_OPACITY = 0.42;

function sliceVisible(candles: Candle[], visibleCount: number, historyPanInt: number): Candle[] {
  if (candles.length === 0) return [];
  const count = Math.min(visibleCount, candles.length);
  const end   = candles.length - historyPanInt;
  const start = Math.max(0, end - count);
  return candles.slice(start, end);
}

function SignalLineSvg({ y, color, chartAreaW, dashed = true, opacity = 0.75 }: {
  y: number; color: string; chartAreaW: number; dashed?: boolean; opacity?: number;
}) {
  return (
    <line x1={0} y1={y} x2={chartAreaW} y2={y}
      stroke={color} strokeWidth="0.13"
      strokeDasharray={dashed ? "0.7,0.35" : undefined} opacity={opacity} />
  );
}

function HtmlLineLabel({ yPct, label, bgClass }: { yPct: number; label: string; bgClass: string }) {
  return (
    <div
      className={`absolute z-[6] pointer-events-none px-1.5 py-px rounded-sm text-[8px] font-mono font-bold text-white whitespace-nowrap leading-none shadow-sm ${bgClass}`}
      style={{ top: `${clamp(yPct, 6, 94)}%`, right: 4, transform: "translateY(-50%)" }}
    >{label}</div>
  );
}

function HtmlEntryMarker({ xPct, wickYPct, type, status }: {
  xPct: number; wickYPct: number; type: Signal["type"]; status: Signal["status"];
}) {
  const isBuy   = type === "BUY";
  const active  = isActiveSignal(status);
  const opacity = signalMarkerOpacity(status);
  const badgeCls = active
    ? isBuy ? "bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.4)]"
            : "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.4)]"
    : isBuy ? "bg-green-500/45 text-green-100/85"
            : "bg-red-500/45 text-red-100/85";
  const arrowCls = active
    ? isBuy ? "text-green-400" : "text-red-400"
    : isBuy ? "text-green-400/65" : "text-red-400/65";
  return (
    <div className="absolute pointer-events-none z-[7] flex flex-col items-center gap-px"
      style={{
        left: `${xPct}%`, top: `${wickYPct}%`,
        transform: isBuy ? "translate(-50%, 4px)" : "translate(-50%, calc(-100% - 4px))",
        opacity,
      }}
    >
      {!isBuy && (
        <>
          <span className={`text-[8px] font-mono font-bold px-1 py-px rounded-sm ${badgeCls} whitespace-nowrap leading-none`}>SELL</span>
          <span className={`text-[10px] leading-none font-bold ${arrowCls}`}>▼</span>
        </>
      )}
      {isBuy && (
        <>
          <span className={`text-[10px] leading-none font-bold ${arrowCls}`}>▲</span>
          <span className={`text-[8px] font-mono font-bold px-1 py-px rounded-sm ${badgeCls} whitespace-nowrap leading-none`}>BUY</span>
        </>
      )}
      {!active && (
        <span className={`absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full border border-white/55 ${
          status === "win" ? "bg-green-400/75" : "bg-red-400/75"
        }`} />
      )}
    </div>
  );
}

function HtmlTpSlExitMarker({ xPct, yPct, kind }: {
  xPct: number; yPct: number; kind: "TP" | "SL";
}) {
  const isTp = kind === "TP";
  return (
    <div
      className="absolute pointer-events-none z-[6] flex flex-col items-center gap-px"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: "translate(-50%, -50%)",
        opacity: CLOSED_EXIT_OPACITY,
      }}
    >
      <span
        className={`text-[7px] font-mono font-bold px-1 py-px rounded-sm whitespace-nowrap leading-none border ${
          isTp
            ? "bg-cyan-500/30 text-cyan-200/75 border-cyan-400/20"
            : "bg-red-500/30 text-red-200/75 border-red-400/20"
        }`}
      >
        {kind}
      </span>
      <span
        className={`w-1.5 h-1.5 rounded-full border border-white/25 ${
          isTp ? "bg-cyan-400/45" : "bg-red-400/45"
        }`}
      />
    </div>
  );
}

interface Crosshair { xPct: number; yPct: number; price: number; timeLabel: string; }
type DragMode = "chart" | "price" | null;

export function CandlestickChart({ candles, signals, viewKey = "default" }: Props) {
  const [visibleCount, setVisibleCount] = useState<number>(DEFAULT_VISIBLE);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [priceZoom, setPriceZoom]       = useState(1);
  const [pricePan, setPricePan]         = useState(0);
  const [dragMode, setDragMode]         = useState<DragMode>(null);
  const [crosshair, setCrosshair]       = useState<Crosshair | null>(null);

  const chartRef      = useRef<HTMLDivElement>(null);
  const plotRef       = useRef<HTMLDivElement>(null);
  const priceScaleRef = useRef<HTMLDivElement>(null);
  const viewRef  = useRef({ viewRange: 1 });
  const dragRef  = useRef({
    active: false, mode: null as DragMode,
    startX: 0, startY: 0, startScroll: 0,
    startPriceZoom: 1, startPricePan: 0, startViewRange: 1,
  });
  const prevCandleLenRef = useRef(0);

  useEffect(() => {
    setVisibleCount(DEFAULT_VISIBLE);
    setScrollOffset(0);
    setPriceZoom(1);
    setPricePan(0);
    prevCandleLenRef.current = 0;
  }, [viewKey]);

  useEffect(() => {
    const len     = candles.length;
    const prevLen = prevCandleLenRef.current;
    if (prevLen > 0 && len > prevLen) {
      const added = len - prevLen;
      setScrollOffset((s) => {
        if (s <= 0) return s;
        return clampScrollOffset(s + added, len, visibleCount);
      });
    }
    prevCandleLenRef.current = len;
  }, [candles.length, visibleCount]);

  const applyZoom = useCallback((zoomIn: boolean, cursorRatio = 0.5) => {
    if (candles.length === 0) return;
    const ratio = clamp(cursorRatio, 0, 1);
    setVisibleCount((prevCount) => {
      const factor   = zoomIn ? 0.85 : 1.18;
      const newCount = clamp(
        Math.round(prevCount * factor),
        MIN_VISIBLE, Math.min(MAX_VISIBLE, candles.length)
      );
      if (newCount === prevCount) return prevCount;
      // Focal-point untuk right-anchored model:
      //   K = ratio / (1 - RIGHT_PADDING_RATIO) - 1
      //   scrollOffset_new = scrollOffset_old + K * (newCount - prevCount)
      // Titik di bawah kursor tetap di posisi yang sama sebelum & sesudah zoom.
      const K = ratio / (1 - RIGHT_PADDING_RATIO) - 1;
      setScrollOffset((prevScroll) =>
        clampScrollOffset(prevScroll + K * (newCount - prevCount), candles.length, newCount)
      );
      return newCount;
    });
  }, [candles.length]);

  // Wheel: zoom in/out (bukan pan)
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (priceScaleRef.current?.contains(e.target as Node)) {
        setPriceZoom((z) => clamp(z * (e.deltaY < 0 ? 1.04 : 0.96), MIN_PRICE_ZOOM, MAX_PRICE_ZOOM));
        return;
      }
      const plotEl      = plotRef.current ?? el;
      const rect        = plotEl.getBoundingClientRect();
      const cursorRatio = clamp((e.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
      // scroll UP (deltaY < 0)  = zoom IN  = sedikit candle = bar melebar
      // scroll DOWN (deltaY > 0) = zoom OUT = banyak candle  = bar menyempit
      applyZoom(e.deltaY < 0, cursorRatio);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  const handleChartMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    dragRef.current = {
      ...dragRef.current, active: true, mode: "chart",
      startX: e.clientX, startY: e.clientY,
      startScroll: scrollOffset, startPricePan: pricePan,
      startViewRange: viewRef.current.viewRange,
    };
    setDragMode("chart");
    setCrosshair(null);
  }, [scrollOffset, pricePan]);

  const handlePriceScaleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    dragRef.current = {
      ...dragRef.current, active: true, mode: "price",
      startY: e.clientY, startPriceZoom: priceZoom, startPricePan: pricePan,
    };
    setDragMode("price");
    setCrosshair(null);
  }, [priceZoom, pricePan]);

  const endDrag = useCallback(() => {
    dragRef.current.active = false;
    dragRef.current.mode   = null;
    setDragMode(null);
  }, []);

  useEffect(() => {
    if (!dragMode) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      if (dragRef.current.mode === "chart") {
        const plotEl = plotRef.current ?? chartRef.current;
        if (!plotEl) return;
        const rect       = plotEl.getBoundingClientRect();
        const deltaX     = e.clientX - dragRef.current.startX;
        const deltaY     = e.clientY - dragRef.current.startY;
        const plotWPx    = Math.max(rect.width,  1);
        const plotHPx    = Math.max(rect.height, 1);
        const barsPerPx  = visibleCount / plotWPx;
        const pricePerPx = (dragRef.current.startViewRange / plotHPx) * CHART_VERTICAL_PAN_RATIO;
        const deltaBars  = deltaX * barsPerPx;
        // drag KIRI (deltaX<0) → scrollOffset turun → candle geser KIRI (future space kanan)
        // drag KANAN (deltaX>0) → scrollOffset naik → candle lama muncul dari kiri
        setScrollOffset(clampScrollOffset(
          dragRef.current.startScroll + deltaBars,
          candles.length, visibleCount,
        ));
        setPricePan(dragRef.current.startPricePan + deltaY * pricePerPx);
        return;
      }
      if (dragRef.current.mode === "price") {
        const deltaY = e.clientY - dragRef.current.startY;
        setPriceZoom(clamp(
          dragRef.current.startPriceZoom * (1 - deltaY * PRICE_DRAG_SENSITIVITY),
          MIN_PRICE_ZOOM, MAX_PRICE_ZOOM,
        ));
        setPricePan(dragRef.current.startPricePan);
      }
    };
    const onUp = () => endDrag();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [dragMode, visibleCount, candles.length, endDrag]);

  const resetView = useCallback(() => {
    setVisibleCount(DEFAULT_VISIBLE);
    setScrollOffset(0);
    setPriceZoom(1);
    setPricePan(0);
  }, []);

  const resetPriceScale = useCallback(() => {
    setPriceZoom(1); setPricePan(0);
  }, []);

  const chartData = useMemo(() => {
    const { historyPanInt, visualShift } = resolveScrollState(scrollOffset);
    const visibleCandles = sliceVisible(candles, visibleCount, historyPanInt);
    if (visibleCandles.length === 0) return null;

    const allHighs   = visibleCandles.map((c) => c.high);
    const allLows    = visibleCandles.map((c) => c.low);
    const maxPrice   = Math.max(...allHighs);
    const minPrice   = Math.min(...allLows);
    const dataRange  = maxPrice - minPrice || 1;
    const pricePad   = dataRange * PRICE_RANGE_PADDING;
    const baseScaleMax   = maxPrice + pricePad;
    const baseScaleMin   = minPrice - pricePad;
    const baseScaleRange = baseScaleMax - baseScaleMin;
    const baseMid    = (baseScaleMax + baseScaleMin) / 2;
    const viewRange  = baseScaleRange / priceZoom;
    const viewMid    = baseMid + pricePan;
    const scaleMax   = viewMid + viewRange / 2;
    const scaleMin   = viewMid - viewRange / 2;
    const scaleRange = viewRange;

    const closes   = candles.map((c) => c.close);
    const ema50All  = calcEMA(closes, INDICATOR_CONFIG.EMA_SHORT);
    const ema200All = calcEMA(closes, INDICATOR_CONFIG.EMA_LONG);
    const rsiAll   = calcRSI(closes);
    const { macd: macdAll, signal: macdSigAll, histogram: histAll } = calcMACD(closes);

    const lastClose   = visibleCandles[visibleCandles.length - 1];
    const lastPrice   = lastClose.close;
    const lastBullish = lastClose.close >= lastClose.open;
    const lastRsi     = rsiAll[candles.length - 1] ?? 50;
    const priceLevels = Array.from({ length: 5 }, (_, i) =>
      scaleMin + (scaleRange * (i + 0.5)) / 5
    );

    const chartAreaW = 88;
    const chartH     = 100;
    const slotCount  = Math.min(visibleCount, candles.length);
    const plotWidth  = chartAreaW * (1 - RIGHT_PADDING_RATIO);
    const candleW    = plotWidth / slotCount;
    const bodyW      = candleW * CHART_CONFIG.CANDLE_BODY_WIDTH_RATIO;

    // candleX — RIGHT-ANCHORED, smooth di semua nilai scrollOffset
    const candleX = (i: number) =>
      plotWidth + (i - slotCount + 0.5 + visualShift) * candleW;

    const mainTop = chartH * CHART_TOP_MARGIN;
    const mainH   = chartH * MAIN_PLOT_HEIGHT;
    const subTop  = mainTop + mainH;
    const macdTop = subTop;
    const macdH   = chartH * MACD_PANEL_HEIGHT;
    const rsiTop  = macdTop + macdH;
    const rsiH    = chartH * RSI_PANEL_HEIGHT;
    const volTop  = rsiTop + rsiH;
    const volH    = chartH * VOL_PANEL_HEIGHT;

    const scaleY = (price: number) =>
      mainTop + ((scaleMax - price) / scaleRange) * mainH;

    const sliceEnd   = candles.length - historyPanInt;
    const sliceStart = Math.max(0, sliceEnd - visibleCandles.length);

    const ema50Points = visibleCandles.map((_, i) => {
      const v = ema50All[sliceStart + i];
      return Number.isFinite(v) ? `${candleX(i)},${scaleY(v)}` : null;
    }).filter((p): p is string => p !== null);

    const ema200Points = visibleCandles.map((_, i) => {
      const v = ema200All[sliceStart + i];
      return Number.isFinite(v) ? `${candleX(i)},${scaleY(v)}` : null;
    }).filter((p): p is string => p !== null);

    const scaleRsiY   = (rsi: number) => rsiTop + (1 - rsi / 100) * rsiH;
    const rsiPoints   = visibleCandles.map((_, i) =>
      `${candleX(i)},${scaleRsiY(rsiAll[sliceStart + i])}`
    );

    const visibleHist    = visibleCandles.map((_, i) => histAll[sliceStart + i]);
    const visibleMacd    = visibleCandles.map((_, i) => macdAll[sliceStart + i]);
    const visibleMacdSig = visibleCandles.map((_, i) => macdSigAll[sliceStart + i]);
    const macdHalf = Math.max(
      ...visibleHist.map(Math.abs),
      ...visibleMacd.map(Math.abs),
      ...visibleMacdSig.map(Math.abs),
      0.0001,
    ) * 1.15;
    const macdMid    = macdTop + macdH / 2;
    const scaleMacdY = (v: number) => macdMid - (v / macdHalf) * (macdH * 0.46);
    const macdPoints    = visibleCandles.map((_, i) =>
      `${candleX(i)},${scaleMacdY(macdAll[sliceStart + i])}`
    );
    const macdSigPoints = visibleCandles.map((_, i) =>
      `${candleX(i)},${scaleMacdY(macdSigAll[sliceStart + i])}`
    );

    const volSeries = visibleCandles.map((c) =>
      c.volume > 0 ? c.volume : Math.max(c.high - c.low, 0),
    );
    const maxVol = Math.max(...volSeries) || 1;

    // visibleRangeMs: total span waktu yang terlihat — untuk label & crosshair
    const visibleRangeMs = visibleCandles.length >= 2
      ? visibleCandles[visibleCandles.length - 1].time - visibleCandles[0].time
      : 60_000;

    const timeStart = visibleCandles[0].time - visibleRangeMs / visibleCandles.length;
    const timeEnd   = visibleCandles[visibleCandles.length - 1].time + visibleRangeMs / visibleCandles.length;

    const placedSignals: PlacedSignal[] = signals
      .filter((s) => s.time >= timeStart && s.time <= timeEnd)
      .slice(0, 20)
      .map((signal) => {
        const candleIndex = findCandleIndex(visibleCandles, signal.time);
        if (candleIndex < 0) return null;
        const candle = visibleCandles[candleIndex];
        const x      = candleX(candleIndex);
        const entryY = scaleY(signal.price);
        const wickY  = signal.type === "BUY" ? scaleY(candle.low) : scaleY(candle.high);
        return { signal, candleIndex, x, entryY, wickY };
      })
      .filter((p): p is PlacedSignal => p !== null);

    const activeSignals = signals.filter((s) => s.status === "active");
    const closedSignals = signals.filter((s) => s.status !== "active");

    const placedExitMarkers: PlacedExitMarker[] = closedSignals
      .filter((s) => s.closeTime && s.closeTime >= timeStart && s.closeTime <= timeEnd)
      .slice(0, 20)
      .map((signal) => {
        const candleIndex = findCandleIndex(visibleCandles, signal.closeTime!);
        if (candleIndex < 0) return null;
        const isWin = signal.status === "win";
        const exitPrice = isWin ? signal.tp : signal.sl;
        return {
          signal,
          x: candleX(candleIndex),
          exitY: scaleY(exitPrice),
          kind: isWin ? ("TP" as const) : ("SL" as const),
        };
      })
      .filter((p): p is PlacedExitMarker => p !== null);

    const timeTicks     = buildTimeTicks(visibleCandles, candleX, chartAreaW);

    return {
      visibleCandles, scaleMax, scaleMin, scaleRange,
      lastPrice, lastBullish, lastRsi,
      priceLevels, chartAreaW, chartH,
      slotCount, plotWidth, candleW, bodyW, visualShift,
      candleX, scaleY, scaleRsiY, scaleMacdY,
      ema50Points, ema200Points, rsiPoints,
      macdPoints, macdSigPoints, visibleHist,
      mainTop, mainH, subTop,
      volTop, volH, macdTop, macdH, macdMid,
      rsiTop, rsiH, maxVol, volSeries,
      placedSignals, placedExitMarkers, activeSignals, closedSignals, timeTicks,
      visibleRangeMs,
    };
  }, [candles, signals, visibleCount, scrollOffset, priceZoom, pricePan]);

  if (!chartData) return null;
  viewRef.current.viewRange = chartData.scaleRange;

  const {
    visibleCandles, scaleMax, scaleMin, scaleRange, lastPrice, lastBullish, lastRsi,
    priceLevels, chartAreaW, chartH, slotCount, plotWidth, candleW, bodyW, visualShift,
    candleX, scaleY, scaleRsiY, scaleMacdY,
    ema50Points, ema200Points, rsiPoints, macdPoints, macdSigPoints, visibleHist,
    mainTop, mainH, subTop, volTop, volH, macdTop, macdH, macdMid, rsiTop, rsiH,
    maxVol, volSeries, placedSignals, placedExitMarkers, activeSignals, closedSignals,
    timeTicks, visibleRangeMs,
  } = chartData;

  const toXPct  = (svgX: number) => (svgX / chartAreaW) * 100;
  const formatP = (p: number) =>
    p.toLocaleString("en-US", {
      minimumFractionDigits: CHART_CONFIG.PRICE_LABEL_DECIMALS,
      maximumFractionDigits: CHART_CONFIG.PRICE_LABEL_DECIMALS,
    });
  const inRange = (p: number) => p >= scaleMin && p <= scaleMax;
  const zoomPct = Math.round((DEFAULT_VISIBLE / visibleCount) * 100);

  const mainRowPct        = (CHART_TOP_MARGIN + MAIN_PLOT_HEIGHT) * 100;
  const subRowPct         = 100 - mainRowPct;
  const subViewH          = chartH - subTop;
  const toMainYPct        = (svgY: number) => ((svgY - mainTop) / mainH) * 100;
  const macdMidSubPct     = ((macdTop + macdH / 2 - subTop) / subViewH) * 100;
  const rsiMidSubPct      = ((rsiTop  + rsiH  / 2 - subTop) / subViewH) * 100;
  const volMidSubPct      = ((volTop  + volH  / 2 - subTop) / subViewH) * 100;
  const macdRsiDivPct     = ((rsiTop  - subTop) / subViewH) * 100;
  const rsiVolDivPct      = ((volTop  - subTop) / subViewH) * 100;
  const badgeTopPct       = clamp(((scaleMax - lastPrice) / scaleRange) * 100, 5, 93);
  const livePriceY        = scaleY(lastPrice);
  const liveLineColor     = lastBullish ? CHART_LINES.bullish : CHART_LINES.bearish;

  const handleHoverMove = (e: React.MouseEvent) => {
    if (dragMode || !plotRef.current) return;
    const rect  = plotRef.current.getBoundingClientRect();
    const xPct  = clamp(((e.clientX - rect.left) / rect.width)  * 100, 0, 100);
    const yPct  = clamp(((e.clientY - rect.top)  / rect.height) * 100, 0, 100);
    const price = scaleMin + clamp(1 - yPct / 100, 0, 1) * scaleRange;
    // Inverse candleX
    const svgX  = (xPct / 100) * chartAreaW;
    const rawI  = (svgX - plotWidth) / candleW - visualShift + slotCount - 0.5;
    const idx   = clamp(Math.round(rawI), 0, visibleCandles.length - 1);
    const timeLabel = formatCrosshairLabel(visibleCandles[idx].time, visibleRangeMs);
    setCrosshair({ xPct, yPct, price, timeLabel });
  };

  return (
    <div
      ref={chartRef}
      className="w-full h-full flex flex-col select-none touch-none"
      role="img"
      aria-label="Chart candlestick — scroll zoom, klik-tahan geser"
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {/* ── Main area ── */}
        <div className="flex min-h-0" style={{ height: `${mainRowPct}%` }}>
          <div
            ref={plotRef}
            className={`flex-1 relative min-w-0 overflow-hidden ${
              dragMode === "chart" ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"
            }`}
            onMouseDown={handleChartMouseDown}
            onMouseMove={handleHoverMove}
            onMouseLeave={() => { if (!dragMode) setCrosshair(null); }}
            onDoubleClick={resetView}
          >
            <svg
              viewBox={`0 ${mainTop} ${chartAreaW} ${mainH}`}
              className="w-full h-full pointer-events-none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {priceLevels.map((p, i) => (
                <line key={i} x1={0} y1={scaleY(p)} x2={chartAreaW} y2={scaleY(p)}
                  stroke="rgba(255,255,255,0.05)" strokeWidth="0.15" />
              ))}
              {visibleCandles.map((c, i) => {
                const bullish    = c.close >= c.open;
                const color      = bullish ? CHART_LINES.bullish : CHART_LINES.bearish;
                const x          = candleX(i);
                const bodyTop    = scaleY(Math.max(c.open, c.close));
                const bodyBot    = scaleY(Math.min(c.open, c.close));
                const bodyHeight = Math.max(bodyBot - bodyTop, 0.3);
                return (
                  <g key={i}>
                    <line x1={x} y1={scaleY(c.high)} x2={x} y2={scaleY(c.low)}
                      stroke={color} strokeWidth="0.15" />
                    <rect x={x - bodyW / 2} y={bodyTop} width={bodyW} height={bodyHeight}
                      fill={color} rx="0.1" />
                  </g>
                );
              })}
              {ema50Points.length  > 1 && (
                <polyline points={ema50Points.join(" ")}  fill="none" stroke="#fbbf24" strokeWidth="0.2" opacity="0.75" />
              )}
              {ema200Points.length > 1 && (
                <polyline points={ema200Points.join(" ")} fill="none" stroke="#38bdf8" strokeWidth="0.2" opacity="0.75" />
              )}
              {activeSignals.map((s, idx) => (
                <g key={`lines-active-${idx}`}>
                  {inRange(s.price) && <SignalLineSvg y={scaleY(s.price)} color={CHART_LINES.entry} chartAreaW={chartAreaW} />}
                  {inRange(s.sl)    && <SignalLineSvg y={scaleY(s.sl)}    color={CHART_LINES.sl}    chartAreaW={chartAreaW} />}
                  {inRange(s.tp)    && <SignalLineSvg y={scaleY(s.tp)}    color={CHART_LINES.tp}    chartAreaW={chartAreaW} />}
                </g>
              ))}
              {closedSignals.map((s, idx) => (
                <g key={`lines-closed-${idx}`} opacity={CLOSED_LINE_OPACITY}>
                  {inRange(s.price) && <SignalLineSvg y={scaleY(s.price)} color={CHART_LINES.entry} chartAreaW={chartAreaW} opacity={0.55} />}
                  {inRange(s.sl)    && <SignalLineSvg y={scaleY(s.sl)}    color={CHART_LINES.sl}    chartAreaW={chartAreaW} opacity={0.55} />}
                  {inRange(s.tp)    && <SignalLineSvg y={scaleY(s.tp)}    color={CHART_LINES.tp}    chartAreaW={chartAreaW} opacity={0.55} />}
                </g>
              ))}
              {placedExitMarkers.map(({ x, exitY, kind }, idx) => (
                <g key={`exit-dot-${idx}`} opacity={CLOSED_EXIT_OPACITY}>
                  <line
                    x1={x - candleW * 0.22} y1={exitY} x2={x + candleW * 0.22} y2={exitY}
                    stroke={kind === "TP" ? CHART_LINES.tp : CHART_LINES.sl}
                    strokeWidth="0.11"
                  />
                  <circle
                    cx={x} cy={exitY} r={0.22}
                    fill={kind === "TP" ? CHART_LINES.tp : CHART_LINES.sl}
                    stroke="white" strokeWidth="0.06" opacity={0.7}
                  />
                </g>
              ))}
              {placedSignals.map(({ signal, x, entryY }, idx) => {
                const dotOp = signalMarkerOpacity(signal.status);
                const color = signal.type === "BUY" ? CHART_LINES.bullish : CHART_LINES.bearish;
                return (
                  <g key={`dot-${idx}`} opacity={dotOp}>
                    <line x1={x} y1={entryY} x2={x + candleW * 0.28} y2={entryY}
                      stroke={color} strokeWidth="0.09" opacity="0.55" />
                    <circle cx={x} cy={entryY} r={0.26}
                      fill={color} stroke="white" strokeWidth="0.07" opacity={0.9} />
                  </g>
                );
              })}
              <line x1={0} y1={livePriceY} x2={chartAreaW} y2={livePriceY}
                stroke={liveLineColor} strokeWidth="0.15" strokeDasharray="0.8,0.4" opacity="1" />
            </svg>

            {activeSignals.map((s, idx) => (
              <Fragment key={`labels-active-${idx}`}>
                {inRange(s.price) && <HtmlLineLabel yPct={toMainYPct(scaleY(s.price))} label="ENTRY" bgClass="bg-slate-400" />}
                {inRange(s.sl)    && <HtmlLineLabel yPct={toMainYPct(scaleY(s.sl))}    label="SL"    bgClass="bg-red-500"   />}
                {inRange(s.tp)    && <HtmlLineLabel yPct={toMainYPct(scaleY(s.tp))}    label="TP"    bgClass="bg-cyan-500" />}
              </Fragment>
            ))}
            {closedSignals.map((s, idx) => {
              const dimLabel = "opacity-[0.38] saturate-50";
              return (
                <Fragment key={`labels-closed-${idx}`}>
                  {inRange(s.price) && (
                    <div className={dimLabel}>
                      <HtmlLineLabel yPct={toMainYPct(scaleY(s.price))} label="ENTRY" bgClass="bg-slate-500/60" />
                    </div>
                  )}
                  {inRange(s.sl) && (
                    <div className={dimLabel}>
                      <HtmlLineLabel yPct={toMainYPct(scaleY(s.sl))} label="SL" bgClass="bg-red-500/55" />
                    </div>
                  )}
                  {inRange(s.tp) && (
                    <div className={dimLabel}>
                      <HtmlLineLabel yPct={toMainYPct(scaleY(s.tp))} label="TP" bgClass="bg-cyan-500/55" />
                    </div>
                  )}
                </Fragment>
              );
            })}
            {placedExitMarkers.map(({ x, exitY, kind }, idx) => (
              <HtmlTpSlExitMarker
                key={`exit-marker-${idx}`}
                xPct={toXPct(x)}
                yPct={toMainYPct(exitY)}
                kind={kind}
              />
            ))}
            {placedSignals.map(({ signal, x, wickY }, idx) => (
              <HtmlEntryMarker
                key={`marker-${idx}`}
                xPct={toXPct(x)} wickYPct={toMainYPct(wickY)}
                type={signal.type} status={signal.status}
              />
            ))}

            {crosshair && !dragMode && (
              <>
                <div className="absolute w-px bg-cyan-400/50 pointer-events-none z-[5]"
                  style={{ left: `${crosshair.xPct}%`, top: 0, height: "100%" }} />
                <div className="absolute left-0 right-0 h-px bg-cyan-400/50 pointer-events-none z-[5]"
                  style={{ top: `${crosshair.yPct}%` }} />
                <div className="absolute z-[6] pointer-events-none px-1.5 py-0.5 rounded
                  bg-cyan-500/90 text-white text-[9px] font-mono font-bold whitespace-nowrap"
                  style={{ top: `${clamp(crosshair.yPct, 6, 90)}%`, right: 4, transform: "translateY(-50%)" }}>
                  {formatP(crosshair.price)}
                </div>
              </>
            )}

            {/* Zoom controls */}
            <div
              className="absolute top-1.5 right-2 flex items-center gap-1 z-10 px-1.5 py-1 rounded
                bg-[#04050a]/90 border border-white/10"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="text-[8px] font-mono text-white/35 pr-1 border-r border-white/10 mr-0.5 whitespace-nowrap">
                {visibleCandles.length} bar
              </span>
              <button type="button" title="Zoom out (lebih banyak candle)" onClick={() => applyZoom(false, 0.5)}
                className="w-5 h-5 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 text-xs font-mono font-bold transition-colors">−</button>
              <span className="text-[8px] font-mono text-white/40 min-w-[28px] text-center whitespace-nowrap">
                {zoomPct}%
              </span>
              <button type="button" title="Zoom in (lebih sedikit candle)" onClick={() => applyZoom(true, 0.5)}
                className="w-5 h-5 flex items-center justify-center rounded text-white/70 hover:text-white hover:bg-white/10 text-xs font-mono font-bold transition-colors">+</button>
              <button type="button" title="Reset tampilan (atau double-click)" onClick={resetView}
                className="w-5 h-5 flex items-center justify-center rounded text-white/50 hover:text-cyan-400 hover:bg-white/10 text-[9px] font-mono transition-colors">⟲</button>
            </div>

            {/* Legend */}
            <div className="absolute left-2 top-1.5 pointer-events-none select-none">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#04050a]/90 border border-white/10">
                <span className="text-[8px] font-mono font-bold text-amber-400 whitespace-nowrap">EMA {INDICATOR_CONFIG.EMA_SHORT}</span>
                <span className="text-[8px] font-mono font-bold text-sky-400 whitespace-nowrap">EMA {INDICATOR_CONFIG.EMA_LONG}</span>
                <span className="text-white/20 text-[8px]">|</span>
                <span className="text-[8px] font-mono font-bold text-green-400 whitespace-nowrap">▲ BUY</span>
                <span className="text-white/20 text-[8px]">|</span>
                <span className="text-[8px] font-mono font-bold text-red-400 whitespace-nowrap">▼ SELL</span>
              </div>
            </div>

            {dragMode === "chart" && (
              <div className="absolute inset-0 bg-cyan-400/[0.03] pointer-events-none z-[4]
                border border-cyan-400/20 rounded-sm" />
            )}
          </div>

          {/* Price scale */}
          <div
            ref={priceScaleRef}
            title="Drag vertikal = zoom harga · Scroll = zoom · 2x klik = reset"
            className={`w-[82px] shrink-0 flex flex-col border-l overflow-hidden select-none touch-none transition-colors ${
              dragMode === "price"
                ? "cursor-ns-resize border-cyan-400/30 bg-cyan-400/[0.04]"
                : "cursor-ns-resize border-white/5 hover:bg-white/[0.02]"
            }`}
            onMouseDown={handlePriceScaleMouseDown}
            onDoubleClick={resetPriceScale}
          >
            <div className="flex-1 relative min-h-0 py-2 pl-1 pr-0.5 pointer-events-none">
              <div className="h-full flex flex-col justify-between">
                {[...priceLevels].reverse().map((p, i) => (
                  <span key={i} className="text-[9px] font-mono text-white/30 leading-none whitespace-nowrap block text-right">
                    {formatP(p)}
                  </span>
                ))}
              </div>
              <div
                className={`absolute right-0 z-10 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap leading-none ${
                  lastBullish ? "bg-green-500 text-white" : "bg-red-500 text-white"
                }`}
                style={{ top: `${badgeTopPct}%`, transform: "translateY(-50%)" }}
              >
                {formatP(lastPrice)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Sub-panel: MACD → RSI → VOL ── */}
        <div
          className="relative min-h-0 border-t border-white/10 bg-[#0a0c14]"
          style={{ height: `${subRowPct}%` }}
        >
          {[0, macdRsiDivPct, rsiVolDivPct].map((topPct) => (
            <div key={topPct}
              className="absolute left-0 right-0 z-[8] h-px bg-white/12 pointer-events-none"
              style={{ top: topPct === 0 ? 0 : `${topPct}%` }} />
          ))}
          <svg
            viewBox={`0 ${subTop} ${chartAreaW} ${subViewH}`}
            className="w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <rect x={0} y={macdTop} width={chartAreaW} height={macdH} fill="rgba(255,255,255,0.025)" />
            <rect x={0} y={rsiTop}  width={chartAreaW} height={rsiH}  fill="rgba(255,255,255,0.02)"  />
            <rect x={0} y={volTop}  width={chartAreaW} height={volH}  fill="rgba(255,255,255,0.02)"  />
            <line x1={0} y1={macdMid} x2={chartAreaW} y2={macdMid}
              stroke="rgba(255,255,255,0.08)" strokeWidth="0.1" />
            {visibleCandles.map((_, i) => {
              const h    = visibleHist[i];
              const y    = scaleMacdY(h);
              const base = macdMid;
              const top  = Math.min(y, base);
              const height = Math.max(Math.abs(y - base), 0.18);
              return (
                <rect key={`mh${i}`}
                  x={candleX(i) - candleW * 0.35} y={top}
                  width={candleW * 0.7} height={height}
                  fill={h >= 0 ? "rgba(34,197,94,0.65)" : "rgba(239,68,68,0.65)"} />
              );
            })}
            <polyline points={macdPoints.join(" ")}    fill="none" stroke="#60a5fa" strokeWidth="0.28" opacity="0.9"  />
            <polyline points={macdSigPoints.join(" ")} fill="none" stroke="#f97316" strokeWidth="0.24" opacity="0.88" />
            <line x1={0} y1={scaleRsiY(70)} x2={chartAreaW} y2={scaleRsiY(70)}
              stroke="rgba(239,68,68,0.3)" strokeWidth="0.1" strokeDasharray="0.5,0.4" />
            <line x1={0} y1={scaleRsiY(30)} x2={chartAreaW} y2={scaleRsiY(30)}
              stroke="rgba(34,197,94,0.3)" strokeWidth="0.1" strokeDasharray="0.5,0.4" />
            <polyline points={rsiPoints.join(" ")} fill="none" stroke="#a78bfa" strokeWidth="0.28" opacity="0.92" />
            <line x1={0} y1={volTop + volH} x2={chartAreaW} y2={volTop + volH}
              stroke="rgba(255,255,255,0.12)" strokeWidth="0.12" />
            {visibleCandles.map((c, i) => {
              const volVal  = volSeries[i];
              const barH    = Math.max((volVal / maxVol) * volH * 0.88, volVal > 0 ? 0.25 : 0);
              const bullish = c.close >= c.open;
              return (
                <rect key={`v${i}`}
                  x={candleX(i) - candleW * 0.35} y={volTop + volH - barH}
                  width={candleW * 0.7} height={barH}
                  fill={bullish ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.55)"} />
              );
            })}
          </svg>
          <div className="absolute left-1.5 top-0 bottom-0 pointer-events-none select-none font-mono text-[8px] leading-none">
            {([["MACD", macdMidSubPct], ["RSI", rsiMidSubPct], ["VOL", volMidSubPct]] as [string, number][]).map(([label, topPct]) => (
              <span key={label}
                className="absolute -translate-y-1/2 px-1.5 py-0.5 rounded-sm bg-black/60 text-white/55 border border-white/8"
                style={{ top: `${topPct}%` }}
              >{label}</span>
            ))}
          </div>
          <div className="absolute right-2 z-[6] pointer-events-none px-1.5 py-0.5 rounded-sm
            bg-violet-500/85 text-white text-[8px] font-mono font-bold leading-none"
            style={{ top: `${rsiMidSubPct}%`, transform: "translateY(-50%)" }}
          >
            RSI {lastRsi.toFixed(0)}
          </div>
        </div>
      </div>

      {/* ── Timescale ── */}
      <div className="flex shrink-0 h-[22px] border-t border-white/10 bg-[#080a10]">
        <div className="flex-1 relative overflow-hidden pointer-events-none">
          {timeTicks.map((tick, i) => (
            <span key={`${tick.label}-${i}`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2
                text-[8px] font-mono text-white/35 whitespace-nowrap leading-none"
              style={{ left: `${clamp(tick.xPct, 4, 96)}%` }}
            >{tick.label}</span>
          ))}
          {crosshair && !dragMode && (
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10
                px-1.5 py-px rounded-sm bg-cyan-500/90 text-white
                text-[8px] font-mono font-bold whitespace-nowrap leading-none"
              style={{ left: `${clamp(crosshair.xPct, 4, 96)}%` }}
            >{crosshair.timeLabel}</span>
          )}
        </div>
        <div className="w-[82px] shrink-0 border-l border-white/5" aria-hidden="true" />
      </div>
    </div>
  );
}
