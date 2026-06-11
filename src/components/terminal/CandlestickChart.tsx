"use client";

import { useMemo } from "react";
import { Candle, Signal } from "./types";
import { TRADING_CONFIG, CHART_CONFIG } from "./config";

interface Props {
  candles: Candle[];
  activeSignals: Signal[];
}

export function CandlestickChart({ candles, activeSignals }: Props) {
  // FIX: Memoize expensive calculations to avoid recalculating on every render
  const chartData = useMemo(() => {
    const visibleCandles = candles.slice(-TRADING_CONFIG.CANDLE_DISPLAY_COUNT);
    
    if (visibleCandles.length === 0) {
      return null;
    }

    const allHighs  = visibleCandles.map((c) => c.high);
    const allLows   = visibleCandles.map((c) => c.low);
    const maxPrice  = Math.max(...allHighs);
    const minPrice  = Math.min(...allLows);
    const range     = maxPrice - minPrice || 1;
    const lastClose = visibleCandles[visibleCandles.length - 1];
    const lastPrice = lastClose.close;
    const lastBullish = lastClose.close >= lastClose.open;

    const priceLevels = Array.from({ length: 5 }, (_, i) =>
      minPrice + (range * (i + 0.5)) / 5
    );

    // Chart dimensions
    const chartAreaW = 88;
    const chartH     = 100;
    const candleW    = chartAreaW / visibleCandles.length;
    const bodyW      = candleW * CHART_CONFIG.CANDLE_BODY_WIDTH_RATIO;

    const scaleY = (price: number) =>
      chartH * 0.05 + ((maxPrice - price) / range) * (chartH * 0.85);

    // Calculate MA points
    const maPoints = visibleCandles.map((_, i) => {
      const slice = visibleCandles.slice(Math.max(0, i - (CHART_CONFIG.MA_PERIOD - 1)), i + 1);
      const avg   = slice.reduce((s, c) => s + c.close, 0) / slice.length;
      return `${(i + 0.5) * candleW},${scaleY(avg)}`;
    });

    // FIX: || 1 mencegah division by zero ketika semua volume = 0
    // Saxo FX/Commodity instruments tidak punya volume data (volume selalu 0)
    // Tanpa || 1: maxVol=0 → volH = (0/0)*12 = NaN → <rect y=NaN height=NaN>
    const maxVol = Math.max(...visibleCandles.map((v) => v.volume)) || 1;

    return {
      visibleCandles,
      maxPrice,
      minPrice,
      range,
      lastPrice,
      lastBullish,
      priceLevels,
      chartAreaW,
      chartH,
      candleW,
      bodyW,
      scaleY,
      maPoints,
      maxVol,
    };
  }, [candles]);

  if (!chartData) return null;

  const {
    visibleCandles,
    maxPrice,
    minPrice,
    range,
    lastPrice,
    lastBullish,
    priceLevels,
    chartAreaW,
    chartH,
    candleW,
    bodyW,
    scaleY,
    maPoints,
    maxVol,
  } = chartData;

  const formatP = (p: number) =>
    p.toLocaleString("en-US", { 
      minimumFractionDigits: CHART_CONFIG.PRICE_LABEL_DECIMALS, 
      maximumFractionDigits: CHART_CONFIG.PRICE_LABEL_DECIMALS 
    });

  return (
    <div className="w-full h-full flex" role="img" aria-label="Trading chart showing candlesticks, volume, and moving average">
      {/* Chart SVG */}
      <div className="flex-1 h-full">
        <svg
          viewBox={`0 0 ${chartAreaW} ${chartH}`}
          className="w-full h-full"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Grid lines */}
          {priceLevels.map((p, i) => (
            <line
              key={i}
              x1="0" y1={scaleY(p)} x2={chartAreaW} y2={scaleY(p)}
              stroke="rgba(255,255,255,0.04)" strokeWidth="0.15"
            />
          ))}

          {/* Candles */}
          {visibleCandles.map((c, i) => {
            const bullish   = c.close >= c.open;
            const color     = bullish ? "#22c55e" : "#ef4444";
            const x         = i * candleW + candleW / 2;
            const bodyTop   = scaleY(Math.max(c.open, c.close));
            const bodyBot   = scaleY(Math.min(c.open, c.close));
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

          {/* MA line */}
          <polyline
            points={maPoints.join(" ")}
            fill="none" stroke="#f59e0b" strokeWidth="0.3" opacity="0.6"
          />

          {/* Current price dashed line */}
          <line
            x1="0" y1={scaleY(lastPrice)} x2={chartAreaW} y2={scaleY(lastPrice)}
            stroke={lastBullish ? "#22c55e" : "#ef4444"}
            strokeWidth="0.15" strokeDasharray="0.8,0.4" opacity="0.5"
          />

          {/* Signal lines: Entry / SL / TP */}
          {activeSignals.map((s, idx) => {
            const inRange = (p: number) => p >= minPrice && p <= maxPrice;
            return (
              <g key={`sig-${idx}`}>
                {inRange(s.price) && (
                  <line x1="0" y1={scaleY(s.price)} x2={chartAreaW} y2={scaleY(s.price)}
                    stroke="#ffffff" strokeWidth="0.15" strokeDasharray="0.6,0.4" opacity="0.5" />
                )}
                {inRange(s.sl) && (
                  <line x1="0" y1={scaleY(s.sl)} x2={chartAreaW} y2={scaleY(s.sl)}
                    stroke="#ef4444" strokeWidth="0.15" strokeDasharray="0.6,0.4" opacity="0.6" />
                )}
                {inRange(s.tp) && (
                  <line x1="0" y1={scaleY(s.tp)} x2={chartAreaW} y2={scaleY(s.tp)}
                    stroke="#22c55e" strokeWidth="0.15" strokeDasharray="0.6,0.4" opacity="0.6" />
                )}
              </g>
            );
          })}

          {/* Volume bars */}
          {visibleCandles.map((c, i) => {
            const volH    = (c.volume / maxVol) * 12;
            const bullish = c.close >= c.open;
            return (
              <rect
                key={`v${i}`}
                x={i * candleW + candleW * 0.15}
                y={chartH - volH}
                width={candleW * 0.7}
                height={volH}
                fill={bullish ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)"}
              />
            );
          })}
        </svg>
      </div>

      {/* Y-axis price scale */}
      <div className="w-[70px] h-full relative border-l border-white/5 pl-1.5">
        <div className="h-full flex flex-col justify-between py-[5%]">
          {[...priceLevels].reverse().map((p, i) => (
            <span key={i} className="text-[9px] font-mono text-white/25 leading-none">
              {formatP(p)}
            </span>
          ))}
        </div>
        {/* Current price badge */}
        <div
          className={`absolute right-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${
            lastBullish ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
          style={{ top: `${((maxPrice - lastPrice) / range) * 85 + 5}%` }}
        >
          {formatP(lastPrice)}
        </div>
      </div>
    </div>
  );
}