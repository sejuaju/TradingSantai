"use client";

import { useMemo } from "react";
import type { Signal } from "./types";
import type { ScoreBreakdown } from "./indicators";
import { MAX_SCORE } from "./indicators";
import { C, T, D } from "./shared";

const MX  = "monospace";
const COL = "1px solid rgba(255,255,255,0.08)";
const PAD = "16px 20px";
/** Tinggi ~6 baris sinyal; sisanya discroll */
const SIGNAL_RADAR_VISIBLE = 6;
const SIGNAL_ROW_HEIGHT = 54;
const SIGNAL_RADAR_MAX_HEIGHT = SIGNAL_RADAR_VISIBLE * SIGNAL_ROW_HEIGHT;

interface Props {
  signals: Signal[];
  scoreBreakdown: ScoreBreakdown;
}

const row = (g = 0): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: g });
const col = (g = 0): React.CSSProperties => ({ display: "flex", flexDirection: "column", gap: g });

function Head({ dot, title, action }: {
  dot: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ ...row(7), marginBottom: 14, justifyContent: "space-between" }}>
      <div style={row(7)}>
        <span style={{ fontSize: 9, color: dot }}>●</span>
        <span style={{
          fontFamily: MX, fontSize: 10, fontWeight: 800,
          letterSpacing: "0.16em", textTransform: "uppercase" as const,
          color: T.body,
        }}>
          {title}
        </span>
      </div>
      {action}
    </div>
  );
}

function RingGauge({ value, bias }: { value: number; bias: "BUY" | "SELL" | "NEUTRAL" }) {
  const cx = 55;
  const cy = 55;
  const rx = 42;
  const sw = 6;
  const circ = 2 * Math.PI * rx;
  const fill = (Math.min(value, 100) / 100) * circ;
  const color = bias === "BUY" ? C.green : bias === "SELL" ? C.red : C.purple;
  const label = bias === "BUY" ? "BULLISH" : bias === "SELL" ? "BEARISH" : "NEUTRAL";
  const ticks = [0, 0.25, 0.5, 0.75].map((t) => {
    const a = t * 2 * Math.PI - Math.PI / 2;
    return {
      x1: cx + (rx - 4) * Math.cos(a),
      y1: cy + (rx - 4) * Math.sin(a),
      x2: cx + (rx + 4) * Math.cos(a),
      y2: cy + (rx + 4) * Math.sin(a),
    };
  });

  return (
    <svg width="110" height="110" viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={rx} fill="none" stroke={color} strokeWidth={sw + 12} opacity="0.07" />
      <circle cx={cx} cy={cy} r={rx} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
        />
      ))}
      <circle
        cx={cx}
        cy={cy}
        r={rx}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.7s ease" }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="26" fontWeight="bold" fontFamily={MX}>
        {value}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9.5" fontFamily={MX} fontWeight="bold" fill={color}>
        {label}
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="8" fontFamily={MX} fill="rgba(255,255,255,0.55)">
        SIGNAL
      </text>
    </svg>
  );
}

function StatCell({ label, value, color, glow }: {
  label: string;
  value: string;
  color: string;
  glow?: boolean;
}) {
  return (
    <div style={{
      position: "relative",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "12px 8px",
      borderRadius: 8,
      gap: 6,
      background: glow ? `${color}12` : "rgba(255,255,255,0.03)",
      border: `1px solid ${glow ? `${color}40` : "rgba(255,255,255,0.08)"}`,
    }}>
      {glow && (
        <div style={{
          position: "absolute",
          top: 0,
          left: "20%",
          right: "20%",
          height: 1.5,
          background: `linear-gradient(90deg,transparent,${color}88,transparent)`,
        }} />
      )}
      <span style={{
        fontFamily: MX,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: T.dim,
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: MX,
        fontSize: 24,
        fontWeight: 800,
        lineHeight: 1,
        color,
        textShadow: `0 0 16px ${color}44`,
      }}>
        {value}
      </span>
    </div>
  );
}

function MiniBar({ value, label, color }: { value: number; label: string; color: string }) {
  const maxH = 48;
  const barH = Math.max(4, (Math.min(value, 100) / 100) * maxH);

  return (
    <div style={{ ...col(4), alignItems: "center", minWidth: 46 }}>
      <span style={{ fontFamily: MX, fontSize: 14, fontWeight: 800, color, textShadow: `0 0 12px ${color}55` }}>
        {value}
      </span>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", height: `${maxH}px` }}>
        <div style={{
          width: 13,
          height: `${barH}px`,
          borderRadius: 3,
          background: `linear-gradient(to top,${color},${color}44)`,
          boxShadow: `0 0 8px ${color}44`,
        }} />
      </div>
      <span style={{
        fontFamily: MX,
        fontSize: 9,
        textTransform: "uppercase" as const,
        textAlign: "center" as const,
        letterSpacing: "0.08em",
        color: T.dim,
        lineHeight: 1.3,
      }}>
        {label}
      </span>
    </div>
  );
}

export function AnalyticsBoard({ signals, scoreBreakdown }: Props) {
  const { buyScore, sellScore, bias } = scoreBreakdown;

  const gauge = Math.round(Math.max(buyScore, sellScore) / MAX_SCORE * 100);

  const bars = [
    { v: Math.max(1, Math.round(buyScore / 2)), l: "YIELD", c: C.cyan },
    { v: Math.max(1, Math.round(sellScore / 2)), l: "MOMENTUM", c: C.purple },
    { v: Math.max(1, Math.round((buyScore + sellScore) / 4)), l: "VALUE", c: C.green },
    { v: Math.max(1, Math.round(buyScore / 8)), l: "RATE", c: C.orange },
  ];

  const sortedSignals = useMemo(
    () => [...signals].sort((a, b) => b.time - a.time),
    [signals],
  );

  const win    = signals.filter((s) => s.status === "win").length;
  const loss   = signals.filter((s) => s.status === "loss").length;
  const closed = win + loss;
  const active = signals.filter((s) => s.status === "active").length;
  const wr     = closed > 0 ? ((win / closed) * 100).toFixed(1) : "0.0";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: D, background: "#060810" }}>

      {/* Kiri: Signal Radar */}
      <div style={{ borderRight: COL, padding: PAD }}>
        <Head dot={C.cyan} title="Signal Radar" />
        {signals.length === 0 ? (
          <div style={{ ...row(10), padding: "10px 0" }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: C.cyan,
              boxShadow: `0 0 6px ${C.cyan}`,
              animation: "pulse 2s infinite",
              flexShrink: 0,
            }} />
            <span style={{ fontFamily: MX, fontSize: 10, color: T.dim }}>
              Scanning signals…
            </span>
          </div>
        ) : (
          <div
            className="signal-scroll"
            style={{
              maxHeight: SIGNAL_RADAR_MAX_HEIGHT,
              overflowY: "auto",
              overflowX: "hidden",
              paddingRight: 4,
            }}
          >
            {sortedSignals.map((s, i) => {
              const isAct = s.status === "active";
              const tc = s.type === "BUY" ? C.green : C.red;
              const dt = new Date(s.time).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" });
              const statusColor =
                s.status === "win" ? C.green :
                s.status === "loss" ? C.red : C.amber;
              const statusLabel =
                s.status === "win" ? "WIN" :
                s.status === "loss" ? "LOSS" : "LIVE";

              return (
                <div
                  key={`${s.time}-${s.type}-${i}`}
                  style={{
                    padding: "6px 8px",
                    marginBottom: 5,
                    borderRadius: 6,
                    background: isAct ? `${tc}0c` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isAct ? `${tc}30` : "rgba(255,255,255,0.07)"}`,
                    opacity: isAct ? 1 : 0.55,
                  }}
                >
                  <div style={{ ...row(7), marginBottom: 4 }}>
                    <span style={{
                      fontFamily: MX,
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: 3,
                      background: `${tc}22`,
                      color: tc,
                      border: `1px solid ${tc}44`,
                      flexShrink: 0,
                    }}>
                      {s.type}
                    </span>
                    <span style={{
                      flex: 1,
                      fontFamily: MX,
                      fontSize: 9.5,
                      color: isAct ? T.body : T.dim,
                      overflow: "hidden",
                      whiteSpace: "nowrap" as const,
                      textOverflow: "ellipsis",
                    }}>
                      {s.reason}
                    </span>
                    <span style={{ fontFamily: MX, fontSize: 9, color: T.dim, flexShrink: 0 }}>{dt}</span>
                  </div>
                  <div style={{
                    fontFamily: MX,
                    fontSize: 9,
                    fontWeight: 800,
                    color: statusColor,
                    letterSpacing: "0.1em",
                  }}>
                    ● {statusLabel}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Kanan: Engine (atas) + Performance (bawah) — urutan asli SignalPanel */}
      <div style={{ ...col(0) }}>
        <div style={{ padding: PAD, borderBottom: COL }}>
          <Head dot={C.purple} title="Signal Engine" />
          <div style={{ ...row(20), alignItems: "center" }}>
            <RingGauge value={gauge} bias={bias} />
            <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flex: 1, justifyContent: "center" }}>
              {bars.map((b) => (
                <MiniBar key={b.l} value={b.v} label={b.l} color={b.c} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: PAD }}>
          <Head
            dot={C.purple}
            title="Signal Performance"
            action={<span style={{ fontSize: 14, color: T.dim, cursor: "pointer" }}>↻</span>}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
            <StatCell label="TOTAL" value={signals.length.toString()} color={C.purple} glow />
            <StatCell label="WIN" value={win.toString()} color={C.cyan} />
            <StatCell label="LOSS" value={loss.toString()} color={C.orange} />
            <StatCell label="WIN RATE" value={closed > 0 ? `${wr}%` : "0.0%"} color={C.green} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <StatCell label="ACTIVE" value={active.toString()} color={C.cyan} />
            <StatCell label="CLOSED" value={closed.toString()} color={C.amber} />
            <StatCell label="ACT" value={active.toFixed(2)} color={C.blue} />
            <StatCell label="RATE" value={Number(wr) > 0 ? `${wr}%` : "0%"} color={C.green} />
          </div>
        </div>
      </div>
    </div>
  );
}