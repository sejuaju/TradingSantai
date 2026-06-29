"use client";

import { useMemo, useState } from "react";
import { C, D, T } from "@/components/terminal/shared";
import type { Signal } from "@/components/terminal/types";

const MX = "monospace";
const row = (gap = 0): React.CSSProperties => ({ display: "flex", alignItems: "center", gap });
const col = (gap = 0): React.CSSProperties => ({ display: "flex", flexDirection: "column", gap });

const INITIAL_CAPITAL = 20;
const LEVERAGE_OPTIONS = [5, 10, 20, 50];
const PIP_SIZE = 1;
const LOT_UNIT = 0.001;

interface Props {
  signals: Signal[];
  currentPrice: number;
  formatPrice: (p: number) => string;
  isFullscreen?: boolean;
}

function calcPositionSize(entryPrice: number, leverage: number) {
  if (entryPrice <= 0) return 0;
  return (INITIAL_CAPITAL * leverage) / entryPrice;
}

function calcSignalPnl(s: Signal, price: number, leverage: number) {
  const posBtc = calcPositionSize(s.price, leverage);
  const diff = s.type === "BUY" ? price - s.price : s.price - price;
  const pnlUsd = posBtc * diff;
  const pnlPct = (pnlUsd / INITIAL_CAPITAL) * 100;
  const pips = diff / PIP_SIZE;
  const lots = posBtc / LOT_UNIT;
  const pipValue = posBtc * PIP_SIZE;
  return { pnlUsd, pnlPct, lots, pipValue, pips };
}

function useAccountMetrics(signals: Signal[], currentPrice: number, leverage: number) {
  return useMemo(() => {
    let realizedPnl = 0;
    signals
      .filter((s) => s.status === "win" || s.status === "loss")
      .forEach((s) => {
        const posBtc = calcPositionSize(s.price, leverage);
        if (s.status === "win") realizedPnl += posBtc * Math.abs(s.tp - s.price);
        if (s.status === "loss") realizedPnl -= posBtc * Math.abs(s.sl - s.price);
      });

    let unrealizedPnl = 0;
    signals
      .filter((s) => s.status === "active")
      .forEach((s) => {
        unrealizedPnl += calcSignalPnl(s, currentPrice, leverage).pnlUsd;
      });

    const activeCount = signals.filter((s) => s.status === "active").length;
    const marginUsed = activeCount > 0 ? INITIAL_CAPITAL : 0;
    const balance = INITIAL_CAPITAL + realizedPnl;
    const equity = balance + unrealizedPnl;
    const freeMargin = Math.max(0, equity - marginUsed);
    const returnPct = ((equity - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
    const marginLvl = marginUsed > 0 ? Math.round((equity / marginUsed) * 100) : 0;

    return { equity, balance, marginUsed, freeMargin, realizedPnl, returnPct, marginLvl };
  }, [signals, currentPrice, leverage]);
}

function PositionRow({
  s,
  currentPrice,
  formatPrice,
  leverage,
}: {
  s: Signal;
  currentPrice: number;
  formatPrice: (p: number) => string;
  leverage: number;
}) {
  const { pnlUsd, pnlPct, lots, pipValue, pips } = calcSignalPnl(s, currentPrice, leverage);
  const isBuy = s.type === "BUY";
  const accent = isBuy ? C.green : C.red;
  const pnlColor = pnlUsd >= 0 ? C.green : C.red;
  const pnlSign = pnlUsd >= 0 ? "+" : "-";
  const pipSign = pips >= 0 ? "+" : "-";

  return (
    <div
      style={{
        padding: "10px 12px",
        marginBottom: 8,
        borderRadius: 10,
        background: `${accent}0a`,
        border: `1px solid ${accent}30`,
      }}
    >
      <div style={{ ...row(8), marginBottom: 6, justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            fontFamily: MX,
            color: accent,
            background: `${accent}20`,
            padding: "3px 8px",
            borderRadius: 5,
            border: `1px solid ${accent}44`,
          }}
        >
          {s.type}
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, fontFamily: MX, color: pnlColor }}>
          {pnlSign}${Math.abs(pnlUsd).toFixed(4)}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 6 }}>
        {[
          { l: "ENTRY", v: formatPrice(s.price), c: T.body },
          { l: "TP", v: formatPrice(s.tp), c: C.green },
          { l: "SL", v: formatPrice(s.sl), c: C.red },
        ].map(({ l, v, c }) => (
          <div
            key={l}
            style={{
              ...col(2),
              alignItems: "center",
              padding: "5px 4px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <span style={{ fontSize: 9, color: T.dim, fontFamily: MX }}>{l}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: c, fontFamily: MX }}>{v}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
        {[
          { l: "LOT", v: lots.toFixed(2) },
          { l: "PIPS", v: `${pipSign}${Math.abs(pips).toFixed(1)}` },
          { l: "ROI", v: `${pnlSign}${Math.abs(pnlPct).toFixed(1)}%` },
        ].map(({ l, v }) => (
          <div key={l} style={{ textAlign: "center" }}>
            <span style={{ fontSize: 8, color: T.dim, fontFamily: MX, display: "block" }}>{l}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: pnlColor, fontFamily: MX }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LabMonitorSidebar({
  signals,
  currentPrice,
  formatPrice,
  isFullscreen = false,
}: Props) {
  const [leverage, setLeverage] = useState(10);

  const active = signals.filter((s) => s.status === "active");
  const closed = signals.filter((s) => s.status === "win" || s.status === "loss");
  const win = signals.filter((s) => s.status === "win").length;
  const loss = signals.filter((s) => s.status === "loss").length;
  const wr = closed.length > 0 ? Math.round((win / closed.length) * 100) : 0;

  const { equity, balance, marginUsed, freeMargin, realizedPnl, returnPct, marginLvl } =
    useAccountMetrics(signals, currentPrice, leverage);

  const retColor = returnPct >= 0 ? C.green : C.red;
  const fmt = (v: number) => `$${Math.abs(v).toFixed(2)}`;

  return (
    <aside
      aria-label="Strategy Lab monitor"
      className="signal-scroll"
      style={{
        width: isFullscreen ? "clamp(300px, 20vw, 400px)" : "290px",
        flexShrink: 0,
        background: "#08090f",
        borderLeft: D,
        fontFamily: MX,
        ...col(0),
        overflowY: "auto",
      }}
    >
      {/* Header + performance */}
      <div style={{ padding: "14px 14px 12px" }}>
        <div style={{ ...row(8), marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ color: C.cyan, fontSize: 12 }}>◈</span>
          <span
            style={{
              fontFamily: MX,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: T.body,
            }}
          >
            Strategy Lab Monitor
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          {[
            { label: "ACTIVE", val: active.length, color: C.cyan },
            { label: "WIN", val: win, color: C.green },
            { label: "LOSS", val: loss, color: C.red },
            { label: "WIN RATE", val: closed.length > 0 ? `${wr}%` : "—", color: C.orange },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                padding: "8px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 9, color: T.dim, fontFamily: MX, letterSpacing: "0.1em", display: "block" }}>
                {s.label}
              </span>
              <span style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: MX }}>{s.val}</span>
            </div>
          ))}
        </div>

        {/* Account */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: 9,
            padding: "10px 12px",
            marginBottom: 10,
          }}
        >
          <div style={{ ...row(0), justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: T.dim, fontFamily: MX }}>RETURN</span>
            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: MX, color: retColor }}>
              {returnPct >= 0 ? "+" : ""}
              {returnPct.toFixed(1)}%
            </span>
          </div>
          {[
            { l: "EQUITY", v: fmt(equity), c: C.cyan },
            { l: "BALANCE", v: fmt(balance), c: T.body },
            { l: "REALIZED", v: `${realizedPnl >= 0 ? "+" : "-"}${fmt(realizedPnl)}`, c: realizedPnl >= 0 ? C.green : C.red },
            { l: "FREE MARGIN", v: fmt(freeMargin), c: T.dim },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ ...row(0), justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontSize: 10, color: T.dim, fontFamily: MX }}>{l}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: c, fontFamily: MX }}>{v}</span>
            </div>
          ))}
          {marginLvl > 0 && (
            <div style={{ ...row(0), justifyContent: "space-between", paddingTop: 6, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 10, color: T.dim, fontFamily: MX }}>MARGIN LVL</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: marginLvl > 200 ? C.green : C.orange, fontFamily: MX }}>
                {marginLvl}%
              </span>
            </div>
          )}
        </div>

        {/* Leverage */}
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: T.dim, fontFamily: MX, letterSpacing: "0.12em" }}>LEVERAGE</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginTop: 6 }}>
            {LEVERAGE_OPTIONS.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLeverage(lv)}
                style={{
                  padding: "6px 0",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: MX,
                  fontSize: 11,
                  fontWeight: 800,
                  border: `1px solid ${leverage === lv ? `${C.orange}66` : "rgba(255,255,255,0.12)"}`,
                  background: leverage === lv ? `${C.orange}22` : "rgba(255,255,255,0.04)",
                  color: leverage === lv ? C.orange : T.dim,
                }}
              >
                {lv}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Positions */}
      <div style={{ padding: "10px 14px 14px", borderTop: D, flex: 1 }}>
        <div style={{ ...row(8), marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ color: C.orange, fontSize: 11 }}>●</span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: T.body, fontFamily: MX }}>
            POSITIONS & SIGNALS
          </span>
          {active.length > 0 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                fontFamily: MX,
                color: C.cyan,
                background: `${C.cyan}20`,
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              {active.length}
            </span>
          )}
        </div>

        {active.length === 0 && closed.length === 0 ? (
          <div
            style={{
              ...col(8),
              alignItems: "center",
              padding: "20px 12px",
              border: "1px dashed rgba(255,255,255,0.15)",
              borderRadius: 9,
              background: "rgba(255,255,255,0.03)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: T.sub, fontFamily: MX }}>
              Belum ada sinyal
            </span>
            <span style={{ fontSize: 10, color: T.dim, fontFamily: MX, lineHeight: 1.5 }}>
              Jalankan backtest — sinyal muncul di chart & panel ini
            </span>
          </div>
        ) : (
          <>
            {active.map((s, i) => (
              <PositionRow
                key={`active-${s.time}-${i}`}
                s={s}
                currentPrice={currentPrice}
                formatPrice={formatPrice}
                leverage={leverage}
              />
            ))}
            {closed.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {[
                  { l: "CLOSED", v: closed.length.toString(), c: T.sub },
                  { l: "TOTAL", v: signals.length.toString(), c: T.body },
                  { l: "MODAL", v: `$${INITIAL_CAPITAL}`, c: T.dim },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ ...row(0), justifyContent: "space-between", padding: "3px 0" }}>
                    <span style={{ fontSize: 10, color: T.dim, fontFamily: MX }}>{l}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: c, fontFamily: MX }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}