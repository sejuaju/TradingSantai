"use client";

import { useState } from "react";
import { C, CHART_LINES, D } from "./shared";
import type { Signal } from "./types";

const row = (gap = 0): React.CSSProperties => ({ display: "flex", alignItems: "center", gap });
const col = (gap = 0): React.CSSProperties => ({ display: "flex", flexDirection: "column", gap });
const MX  = "monospace";

const T = {
  dim  : "rgba(255,255,255,0.45)",
  sub  : "rgba(255,255,255,0.62)",
  body : "rgba(255,255,255,0.82)",
  main : "rgba(255,255,255,0.96)",
};

interface Props {
  currentPrice : number;
  signals      : Signal[];
  formatPrice  : (p: number) => string;
  connected    : boolean;
}

// ─── Mini balance box ─────────────────────────────────────────────────────────
function BalBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      ...col(3), flex: 1, alignItems: "center",
      padding: "6px 4px", borderRadius: 5,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.09)",
    }}>
      <span style={{ fontFamily: MX, fontSize: 7.5, color: T.dim,
        letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: MX, fontSize: 11, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

// ─── Open Position row ────────────────────────────────────────────────────────
function PosRow({ s, formatPrice }: { s: Signal; formatPrice: (p: number) => string }) {
  const isBuy   = s.type === "BUY";
  const color   = isBuy ? C.green : C.red;
  const current = s.closePrice ?? s.price; // use close if exists
  const pnl     = isBuy ? current - s.price : s.price - current;
  const pnlPct  = ((pnl / s.price) * 100).toFixed(2);
  const pnlStr  = `${pnl >= 0 ? "+" : ""}${pnlPct}%`;

  return (
    <div style={{
      padding: "7px 10px",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      ...col(4),
    }}>
      <div style={{ ...row(0), justifyContent: "space-between" }}>
        <div style={{ ...row(5) }}>
          <span style={{ fontFamily: MX, fontSize: 10, fontWeight: 700, color }}>
            {isBuy ? "▲" : "▼"} {s.type}
          </span>
          <span style={{ fontFamily: MX, fontSize: 8.5, color: T.sub }}>BTC/USDT</span>
        </div>
        <span style={{
          fontFamily: MX, fontSize: 9, fontWeight: 700,
          color: pnl >= 0 ? C.green : C.red,
        }}>{pnlStr}</span>
      </div>
      <div style={{ ...row(0), justifyContent: "space-between", marginTop: 2 }}>
        <span style={{ fontFamily: MX, fontSize: 8, color: T.dim }}>
          @ {formatPrice(s.price)}
        </span>
        <div style={{ ...row(8) }}>
          <span style={{ fontFamily: MX, fontSize: 7.5, color: T.dim }}>
            SL <span style={{ color: C.red }}>{formatPrice(s.sl)}</span>
          </span>
          <span style={{ fontFamily: MX, fontSize: 7.5, color: T.dim }}>
            TP <span style={{ color: CHART_LINES.tp }}>{formatPrice(s.tp)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main UserMonitor ─────────────────────────────────────────────────────────
export function UserMonitor({ currentPrice, signals, formatPrice, connected }: Props) {
  const [cubityOn, setCubityOn] = useState(true);

  const activeSignals = signals.filter((s) => s.status === "active");
  const winCount      = signals.filter((s) => s.status === "win").length;
  const lossCount     = signals.filter((s) => s.status === "loss").length;
  const totalClosed   = winCount + lossCount;
  const winRate       = totalClosed > 0
    ? Math.round((winCount / totalClosed) * 100) : 0;

  // Simulated account data
  const accountPnl  = activeSignals.length > 0
    ? (activeSignals[0].type === "BUY"
        ? currentPrice - activeSignals[0].price
        : activeSignals[0].price - currentPrice)
    : 52.06;
  const pnlColor    = accountPnl >= 0 ? C.green : C.red;
  const pnlStr      = `${accountPnl >= 0 ? "+" : ""}${accountPnl.toFixed(2)}`;

  const equity  = currentPrice > 0 ? (currentPrice * 0.001).toFixed(2) : "—";
  const margin  = currentPrice > 0 ? (currentPrice * 0.0002).toFixed(2) : "—";

  return (
    <div style={{
      width: 200, flexShrink: 0,
      background: "#08090f",
      borderLeft: D,
      ...col(0),
      fontFamily: MX,
      overflowY: "auto",
    }}>

      {/* ── Header ── */}
      <div style={{
        ...row(6), padding: "8px 12px",
        borderBottom: D,
        background: "rgba(0,0,0,0.3)",
      }}>
        <span style={{ color: C.cyan, fontSize: 10 }}>●</span>
        <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.18em",
          textTransform: "uppercase", color: T.body }}>
          Master User Monitor
        </span>
      </div>

      {/* ── User + PnL ── */}
      <div style={{ padding: "10px 12px", borderBottom: D }}>
        <div style={{ ...row(0), justifyContent: "space-between", alignItems: "center",
          marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.cyan }}>
            Ras_C109177580
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: pnlColor }}>
            {pnlStr}
          </span>
        </div>

        {/* Balance boxes */}
        <div style={{ ...row(6) }}>
          <BalBox label="BALANCE" value={equity}  color={T.main}   />
          <BalBox label="INCOME"  value={margin}  color={C.purple} />
        </div>
      </div>

      {/* ── CUBITY LOOSE ── */}
      <div style={{ padding: "10px 12px", borderBottom: D }}>
        <div style={{ ...row(0), justifyContent: "space-between",
          alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.15em",
            textTransform: "uppercase", color: T.sub }}>
            Cubity Loose
          </span>
          {/* Toggle */}
          <button
            onClick={() => setCubityOn(!cubityOn)}
            style={{
              width: 32, height: 18, borderRadius: 9,
              background: cubityOn ? C.teal : "rgba(255,255,255,0.1)",
              border: "none", cursor: "pointer", position: "relative",
              transition: "background 0.2s", flexShrink: 0,
            }}
          >
            <div style={{
              position: "absolute", top: 2,
              left: cubityOn ? 16 : 2,
              width: 14, height: 14,
              borderRadius: "50%", background: "white",
              transition: "left 0.2s",
            }}/>
          </button>
        </div>

        {/* Status bar */}
        <div style={{ height: 6, borderRadius: 99,
          background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: cubityOn ? `${Math.max(winRate, 20)}%` : "0%",
            borderRadius: 99,
            background: `linear-gradient(90deg, ${C.teal}, ${C.green})`,
            boxShadow: `0 0 8px ${C.teal}66`,
            transition: "width 0.8s ease",
          }}/>
        </div>
        <div style={{ ...row(0), justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 7.5, color: T.dim }}>STATUS</span>
          <span style={{ fontSize: 7.5, fontWeight: 700,
            color: cubityOn ? C.teal : T.dim }}>
            {cubityOn ? "ACTIVE" : "INACTIVE"}
          </span>
        </div>
      </div>

      {/* ── Account Stats ── */}
      <div style={{ padding: "8px 12px", borderBottom: D }}>
        <div style={{ ...row(0), justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 7.5, color: T.dim, letterSpacing: "0.1em",
            textTransform: "uppercase" }}>Account Stats</span>
          <span style={{ fontSize: 7.5, fontWeight: 700,
            color: connected ? C.green : C.red }}>
            {connected ? "● SYNC" : "● DISCONN"}
          </span>
        </div>
        {[
          { label: "WIN",   val: winCount.toString(),  color: C.green  },
          { label: "LOSS",  val: lossCount.toString(), color: C.red    },
          { label: "W.RATE",val: winRate > 0 ? `${winRate}%` : "—", color: winRate >= 60 ? C.green : C.amber },
          { label: "ACTIVE",val: activeSignals.length.toString(), color: C.cyan },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ ...row(0), justifyContent: "space-between",
            padding: "2.5px 0" }}>
            <span style={{ fontSize: 9, color: T.dim }}>{label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color }}>{val}</span>
          </div>
        ))}
      </div>

      {/* ── Open Positions ── */}
      <div style={{ flex: 1, ...col(0) }}>
        <div style={{ ...row(0), justifyContent: "space-between",
          alignItems: "center", padding: "8px 12px",
          borderBottom: D }}>
          <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.15em",
            textTransform: "uppercase", color: T.body }}>
            Open Positions
          </span>
          <button style={{
            width: 20, height: 20, borderRadius: 4,
            background: `${C.cyan}20`,
            border: `1px solid ${C.cyan}40`,
            color: C.cyan, fontSize: 14, fontWeight: 700,
            cursor: "pointer", lineHeight: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>+</button>
        </div>

        {activeSignals.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center",
            justifyContent: "center", padding: "24px 12px" }}>
            <div style={{ ...col(6), alignItems: "center" }}>
              <span style={{ fontSize: 22, opacity: 0.1 }}>◻</span>
              <span style={{ fontSize: 8.5, color: T.dim, letterSpacing: "0.1em",
                textTransform: "uppercase" }}>No Positions</span>
            </div>
          </div>
        ) : (
          activeSignals.map((s, i) => (
            <PosRow key={i} s={s} formatPrice={formatPrice} />
          ))
        )}
      </div>

    </div>
  );
}
