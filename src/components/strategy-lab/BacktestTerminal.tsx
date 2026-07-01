"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { CandlestickChart } from "@/components/terminal/CandlestickChart";
import { AgentSidebar } from "@/components/terminal/AgentSidebar";
import { calcEMA, calcRSI } from "@/components/terminal/indicators";
import type { Candle } from "@/components/terminal/types";
import { enrichSignalsWithTrades, type BacktestResult } from "@/lib/strategy-lab";

const T = {
  mute: "rgba(255,255,255,0.52)",
  dim: "rgba(255,255,255,0.65)",
  sub: "rgba(255,255,255,0.78)",
  body: "rgba(255,255,255,0.90)",
  main: "rgba(255,255,255,0.97)",
};

function IconExpand() {
  return (
    <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
      <path d="M1 5V1H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 1H12V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8V12H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12H1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCollapse() {
  return (
    <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
      <path d="M5 1V5H1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 5H8V1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 12V8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M1 8H5V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatPnl(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(5)}`;
}

function formatPrice(p: number) {
  return p.toLocaleString("en-US", { minimumFractionDigits: 5, maximumFractionDigits: 5 });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  candles: Candle[];
  result: BacktestResult | null;
  running: boolean;
  strategyName: string;
  isSmcStrategy: boolean;
  barCount: number;
}

export default function BacktestTerminal({
  candles,
  result,
  running,
  strategyName,
  isSmcStrategy,
  barCount,
}: Props) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chartSignals = useMemo(() => {
    if (!result?.ok) return [];
    return enrichSignalsWithTrades(result.signals, result.trades);
  }, [result]);

  const lastPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const firstPrice = candles.length > 0 ? candles[0].close : 0;
  const priceChange =
    firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  const { ema50, ema200, rsi } = useMemo(() => {
    if (candles.length < 2) {
      return { ema50: 0, ema200: 0, rsi: 50 };
    }
    const closes = candles.map((c) => c.close);
    const ema50Arr = calcEMA(closes, 9);
    const ema200Arr = calcEMA(closes, 21);
    const rsiArr = calcRSI(closes);
    const last = closes.length - 1;
    return {
      ema50: ema50Arr[last] ?? closes[last],
      ema200: ema200Arr[last] ?? closes[last],
      rsi: rsiArr[last] ?? 50,
    };
  }, [candles]);

  const high = useMemo(
    () => (candles.length ? Math.max(...candles.map((c) => c.high)) : 0),
    [candles],
  );
  const low = useMemo(
    () => (candles.length ? Math.min(...candles.map((c) => c.low)) : 0),
    [candles],
  );

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) terminalRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  return (
    <div
      ref={terminalRef}
      style={{
        background: "#08090f",
        display: "flex",
        flexDirection: "column",
        height: isFullscreen ? "100vh" : "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 16px",
          background: "#04050a",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {["#dc2626bb", "#d97706aa", "#16a34aaa"].map((bg, i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: bg }} />
            ))}
          </div>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: T.sub,
            }}
          >
            STRATEGY LAB · BACKTEST TERMINAL
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#4ade80" }}>
            ● BACKTEST
          </span>
          <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.12)" }} />
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 11px",
              borderRadius: 5,
              cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.15)",
              background: isFullscreen ? "rgba(0,212,232,0.15)" : "rgba(255,255,255,0.07)",
              color: isFullscreen ? "#00d4e8" : T.sub,
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            {isFullscreen ? <IconCollapse /> : <IconExpand />}
            <span>{isFullscreen ? "EXIT FULL" : "FULLSCREEN"}</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Left — signal feed */}
        <AgentSidebar signals={chartSignals} isFullscreen={isFullscreen} />

        {/* Center */}
        <div
          className="no-scrollbar"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {/* Instrument + KPI row */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#07080f", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px 7px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#00d4e8",
                  letterSpacing: "0.08em",
                }}
              >
                EUR/USD
              </span>
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.10)" }} />
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 18,
                  fontWeight: 800,
                  color: priceChange >= 0 ? "#4ade80" : "#f87171",
                }}
              >
                {lastPrice > 0 ? formatPrice(lastPrice) : "—"}
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 5,
                  background: priceChange >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                  border: `1px solid ${priceChange >= 0 ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)"}`,
                  color: priceChange >= 0 ? "#4ade80" : "#f87171",
                }}
              >
                {priceChange >= 0 ? "+" : ""}
                {priceChange.toFixed(2)}%
              </span>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  color: "#4ade80",
                  letterSpacing: "0.1em",
                }}
              >
                DEMO DATA
              </span>

              <div style={{ marginLeft: "auto", display: "flex", gap: 18 }}>
                {[
                  { l: "BARS", v: String(candles.length || barCount), c: T.body },
                  { l: "HIGH", v: high > 0 ? formatPrice(high) : "—", c: "#4ade80" },
                  { l: "LOW", v: low > 0 ? formatPrice(low) : "—", c: "#f87171" },
                  { l: "TF", v: "M5", c: "#00d4e8" },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontFamily: "monospace", fontSize: 9, fontWeight: 600, color: T.mute, letterSpacing: "0.12em" }}>
                      {l}
                    </span>
                    <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy + indicators */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 14px 8px",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: T.dim }}>{strategyName}</span>
                {result?.engine && (
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 4,
                      background: "rgba(0,212,232,0.12)",
                      border: "1px solid rgba(0,212,232,0.25)",
                      color: "#00d4e8",
                    }}
                  >
                    {result.engine}
                  </span>
                )}
                {isSmcStrategy && (
                  <span style={{ fontFamily: "monospace", fontSize: 9, color: T.mute }}>
                    SMC · H1 bias → sweep → MSS → FVG
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <IndicatorPill label="EMA" bull={ema50 > ema200} />
                <IndicatorPill
                  label={`RSI ${rsi.toFixed(0)}`}
                  bull={rsi < 70 && rsi > 30}
                  color={rsi > 70 ? "#f87171" : rsi < 30 ? "#4ade80" : T.body}
                />
              </div>
            </div>
          </div>

          {/* Chart — flex agar mengisi ruang tersisa tanpa overflow halaman */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              padding: "6px 8px 8px",
              background: "#0d0f1a",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1, minHeight: 0 }}>
              {running ? (
                <ChartPlaceholder title="RUNNING BACKTEST" subtitle="Menghitung sinyal & simulasi trade…" spinning />
              ) : !result ? (
                <ChartPlaceholder
                  title="BELUM ADA BACKTEST"
                  subtitle={`Klik Run Backtest — dataset demo EUR · ${barCount} bar M5`}
                />
              ) : !result.ok ? (
                <ChartPlaceholder title="BACKTEST GAGAL" subtitle={result.error ?? "Unknown error"} error />
              ) : candles.length === 0 ? (
                <ChartPlaceholder title="DATA KOSONG" subtitle="Tidak ada candle untuk ditampilkan." error />
              ) : (
                <CandlestickChart
                  candles={candles}
                  signals={chartSignals}
                  viewKey={`backtest-${strategyName}-${candles.length}`}
                />
              )}
            </div>
          </div>

          {/* Performance analytics strip */}
          <BacktestAnalyticsStrip result={result} running={running} />

          {/* Status bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 16px",
              background: "#03040a",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: 16, fontFamily: "monospace", fontSize: 10, letterSpacing: "0.1em", color: T.dim }}>
              <span>STRATEGY LAB BACKTEST</span>
              <span>TF: M5 · DEMO EUR</span>
              <span>EMA · RSI · MACD · VOLUME</span>
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: "0.1em", color: T.dim }}>
              {result?.ok ? `${result.totalTrades} trades · ${result.signals.length} signals` : "—"}
            </span>
          </div>
        </div>

        {/* Right — trade log + metrics */}
        <BacktestMetricsSidebar result={result} running={running} />
      </div>
    </div>
  );
}

function IndicatorPill({
  label,
  bull,
  color,
}: {
  label: string;
  bull: boolean;
  color?: string;
}) {
  const c = color ?? (bull ? "#4ade80" : "#f87171");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 5,
        fontFamily: "monospace",
        fontSize: 10,
        fontWeight: 700,
        background: bull ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        border: bull ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)",
        color: c,
      }}
    >
      {label}
    </div>
  );
}

function ChartPlaceholder({
  title,
  subtitle,
  spinning,
  error,
}: {
  title: string;
  subtitle: string;
  spinning?: boolean;
  error?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        height: "100%",
        background: "#0d0f1a",
      }}
    >
      {spinning && (
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid rgba(255,255,255,0.1)",
            borderTop: "3px solid #00d4e8",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      )}
      <div style={{ textAlign: "center", maxWidth: 420, padding: "0 20px" }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            fontWeight: 700,
            color: error ? "#f87171" : T.main,
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          {title}
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: T.dim, lineHeight: 1.6 }}>{subtitle}</div>
      </div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function BacktestAnalyticsStrip({
  result,
  running,
}: {
  result: BacktestResult | null;
  running: boolean;
}) {
  if (running || !result?.ok) {
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "#06070d",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "monospace", fontSize: 10, color: T.mute, letterSpacing: "0.12em" }}>
          PERFORMANCE ANALYTICS — jalankan backtest untuk melihat hasil di chart
        </span>
      </div>
    );
  }

  const winPct = Math.min(100, result.winRate);

  return (
    <div
      className="no-scrollbar"
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 10,
        padding: "10px 14px",
        background: "#06070d",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
        overflowX: "auto",
      }}
    >
      <MetricCard label="Win Rate" value={`${result.winRate.toFixed(1)}%`} accent>
        <div
          style={{
            marginTop: 6,
            height: 4,
            borderRadius: 99,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${winPct}%`,
              height: "100%",
              background: "#22c55e",
              borderRadius: 99,
            }}
          />
        </div>
      </MetricCard>
      <MetricCard
        label="Net P/L"
        value={formatPnl(result.netPnl)}
        color={result.netPnl >= 0 ? "#4ade80" : "#f87171"}
      />
      <MetricCard label="Profit Factor" value={result.profitFactor.toFixed(2)} />
      <MetricCard label="Max Drawdown" value={formatPnl(-result.maxDrawdown)} color="#f87171" />
      <MetricCard label="Total Trades" value={String(result.totalTrades)} />
      <MetricCard label="Signals" value={String(result.signals.length)} />
    </div>
  );
}

function MetricCard({
  label,
  value,
  color = T.main,
  accent,
  children,
}: {
  label: string;
  value: string;
  color?: string;
  accent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        minWidth: 108,
        padding: "8px 12px",
        borderRadius: 8,
        background: accent ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
        border: accent ? "1px solid rgba(34,197,94,0.15)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ fontFamily: "monospace", fontSize: 9, color: T.mute, letterSpacing: "0.12em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 800, color }}>{value}</div>
      {children}
    </div>
  );
}

function BacktestMetricsSidebar({
  result,
  running,
}: {
  result: BacktestResult | null;
  running: boolean;
}) {
  return (
    <div
      className="hidden xl:flex"
      style={{
        width: 240,
        flexShrink: 0,
        background: "#05060c",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <span style={{ color: "#f97316", fontSize: 12 }}>◈</span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.18em",
              color: T.body,
            }}
          >
            TRADE LOG
          </span>
        </div>
        <span style={{ fontFamily: "monospace", fontSize: 9, color: T.mute }}>Hasil simulasi per posisi</span>
      </div>

      <div className="signal-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {running ? (
          <p style={{ fontFamily: "monospace", fontSize: 10, color: T.mute, textAlign: "center", marginTop: 24 }}>
            Menghitung…
          </p>
        ) : !result?.ok || result.trades.length === 0 ? (
          <p style={{ fontFamily: "monospace", fontSize: 10, color: T.mute, textAlign: "center", marginTop: 24 }}>
            {!result ? "Belum ada trade" : result.ok ? "Tidak ada trade pada periode ini" : "Backtest gagal"}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {result.trades.map((t, i) => (
              <div
                key={`${t.entryTime}-${i}`}
                style={{
                  padding: "10px 10px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      fontWeight: 800,
                      color: t.type === "BUY" ? "#4ade80" : "#f87171",
                    }}
                  >
                    {t.type}
                  </span>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      color: t.result === "win" ? "#4ade80" : "#f87171",
                    }}
                  >
                    {formatPnl(t.pnl)}
                  </span>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: T.mute, lineHeight: 1.5 }}>
                  <div>Entry: {formatPrice(t.entryPrice)}</div>
                  <div>Exit: {formatPrice(t.exitPrice)}</div>
                  <div>{formatTime(t.entryTime)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}