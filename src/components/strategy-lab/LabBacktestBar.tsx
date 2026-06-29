"use client";

import type { BacktestResult } from "@/lib/strategy-lab";

const T = {
  dim: "rgba(255,255,255,0.65)",
  mute: "rgba(255,255,255,0.52)",
  main: "rgba(255,255,255,0.97)",
};

function formatPnl(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(5)}`;
}

interface Props {
  result: BacktestResult | null;
  running: boolean;
  strategyName: string;
  useReplayCandles: boolean;
  onExitReplay?: () => void;
}

export default function LabBacktestBar({
  result,
  running,
  strategyName,
  useReplayCandles,
  onExitReplay,
}: Props) {
  return (
    <div
      style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "linear-gradient(180deg, rgba(34,197,94,0.06) 0%, rgba(8,9,15,0.95) 100%)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "0.16em",
              color: "#22c55e",
              padding: "3px 8px",
              borderRadius: 4,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
          >
            BACKTEST ENGINE
          </span>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: T.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {strategyName}
          </span>
          {useReplayCandles && result?.ok && (
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "#f59e0b" }}>
              · Replay dataset SMC
            </span>
          )}
        </div>

        {useReplayCandles && result?.ok && onExitReplay && (
          <button
            type="button"
            onClick={onExitReplay}
            style={{
              padding: "4px 10px",
              borderRadius: 5,
              border: "1px solid rgba(0,212,232,0.3)",
              background: "rgba(0,212,232,0.1)",
              color: "#00d4e8",
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Kembali ke Live Chart
          </button>
        )}
      </div>

      {running ? (
        <div style={{ padding: "10px 16px 12px", fontFamily: "monospace", fontSize: 10, color: T.mute }}>
          Menjalankan backtest pada chart…
        </div>
      ) : result?.ok ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: 8,
            padding: "0 16px 12px",
          }}
        >
          <Metric label="Win Rate" value={`${result.winRate.toFixed(1)}%`} accent />
          <Metric
            label="Net P/L"
            value={formatPnl(result.netPnl)}
            color={result.netPnl >= 0 ? "#4ade80" : "#f87171"}
          />
          <Metric label="Profit Factor" value={result.profitFactor.toFixed(2)} />
          <Metric label="Max DD" value={formatPnl(-result.maxDrawdown)} color="#f87171" />
          <Metric label="Trades" value={String(result.totalTrades)} />
          <Metric label="Signals" value={String(result.signals.length)} />
          {result.engine && <Metric label="Engine" value={result.engine} small />}
        </div>
      ) : result && !result.ok ? (
        <div style={{ padding: "10px 16px 12px", fontFamily: "monospace", fontSize: 10, color: "#f87171" }}>
          {result.error}
        </div>
      ) : (
        <div style={{ padding: "10px 16px 12px", fontFamily: "monospace", fontSize: 10, color: T.mute }}>
          Chart live aktif — klik Run Backtest untuk overlay sinyal strategi di chart
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  color = T.main,
  small,
}: {
  label: string;
  value: string;
  accent?: boolean;
  color?: string;
  small?: boolean;
}) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 6,
        background: accent ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.03)",
        border: accent ? "1px solid rgba(34,197,94,0.15)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ fontFamily: "monospace", fontSize: 8, color: T.mute, letterSpacing: "0.1em", marginBottom: 2 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "monospace",
          fontSize: small ? 9 : 12,
          fontWeight: 800,
          color,
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
    </div>
  );
}