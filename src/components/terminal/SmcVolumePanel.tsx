"use client";

import { useMemo } from "react";
import { C, D } from "./shared";
import type { Candle } from "./types";
import type { ScoreBreakdown } from "./indicators";

const MX = "monospace";
const row = (gap = 0): React.CSSProperties => ({ display: "flex", alignItems: "center", gap });
const col = (gap = 0): React.CSSProperties => ({ display: "flex", flexDirection: "column", gap });

const T = {
  dim  : "rgba(255,255,255,0.35)",
  sub  : "rgba(255,255,255,0.55)",
  body : "rgba(255,255,255,0.80)",
  main : "rgba(255,255,255,0.95)",
};

interface Props {
  candles        : Candle[];
  scoreBreakdown : ScoreBreakdown;
  currentPrice   : number;
  formatPrice    : (p: number) => string;
  selectedTf     : string;
  htfTrend       : "bullish" | "bearish" | "neutral";
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionTitle({ icon, title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div style={{ ...row(6), marginBottom: 10 }}>
      {icon && <span style={{ color: C.orange, fontSize: 10 }}>●</span>}
      <div style={{ ...col(1) }}>
        <span style={{
          fontFamily: MX, fontSize: 9, fontWeight: 800,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: icon ? C.orange : C.cyan,
        }}>
          {title}
        </span>
        {sub && (
          <span style={{
            fontFamily: MX, fontSize: 7.5, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: T.sub,
          }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Liquidity row ────────────────────────────────────────────────────────────
function LiqRow({
  label, value, valueColor, time,
}: {
  label: string; value?: string; valueColor?: string; time: string;
}) {
  return (
    <div style={{
      ...row(0), justifyContent: "space-between",
      padding: "6px 10px", marginBottom: 4,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 5,
    }}>
      <span style={{ fontFamily: MX, fontSize: 9, color: T.body }}>{label}</span>
      <div style={{ ...row(10) }}>
        {value && (
          <span style={{
            fontFamily: MX, fontSize: 9, fontWeight: 800,
            color: valueColor ?? C.cyan,
            background: `${valueColor ?? C.cyan}18`,
            padding: "1px 6px", borderRadius: 3,
          }}>
            {value}
          </span>
        )}
        <span style={{ fontFamily: MX, fontSize: 8, color: T.dim }}>{time}</span>
      </div>
    </div>
  );
}

// ─── Volume Profile slider ────────────────────────────────────────────────────
function VolumeSlider({
  label, value, pct, sublabel,
}: {
  label: string; value: string; pct: number; sublabel?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ ...row(0), justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: MX, fontSize: 9, color: T.body }}>{label}</span>
        <span style={{ fontFamily: MX, fontSize: 10, fontWeight: 800, color: T.main }}>{value}</span>
      </div>
      <div style={{
        position: "relative", height: 4, borderRadius: 99,
        background: "rgba(255,255,255,0.08)",
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${pct}%`, borderRadius: 99,
          background: `linear-gradient(90deg, ${C.cyan}, ${C.purple})`,
        }} />
        <div style={{
          position: "absolute", top: "50%", left: `${pct}%`,
          transform: "translate(-50%, -50%)",
          width: 10, height: 10, borderRadius: "50%",
          background: C.red,
          boxShadow: `0 0 6px ${C.red}`,
        }} />
      </div>
      {sublabel && (
        <div style={{ ...row(0), justifyContent: "flex-end", marginTop: 3 }}>
          <span style={{ fontFamily: MX, fontSize: 8, color: T.dim }}>{sublabel}</span>
        </div>
      )}
    </div>
  );
}

// ─── Trend Matrix cell ────────────────────────────────────────────────────────
function TrendCell({
  isBull, label,
}: {
  isBull: boolean; label: string;
}) {
  const accent = isBull ? C.cyan : C.red;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "8px 4px", borderRadius: 5,
      border: `1px solid ${accent}44`,
      background: `${accent}0a`,
      gap: 3,
    }}>
      <span style={{ fontSize: 14, color: accent, lineHeight: 1 }}>
        {isBull ? "∧" : "∨"}
      </span>
      <span style={{
        fontFamily: MX, fontSize: 7.5, fontWeight: 700,
        color: accent, letterSpacing: "0.1em",
      }}>
        {label}
      </span>
    </div>
  );
}

// ─── Main SmcVolumePanel ──────────────────────────────────────────────────────
export function SmcVolumePanel({
  candles, scoreBreakdown, currentPrice, formatPrice, selectedTf, htfTrend,
}: Props) {
  const { buyScore, sellScore, bias } = scoreBreakdown;
  const isBull = bias === "BUY";

  // Derive SMC values from candle data
  const smcData = useMemo(() => {
    if (candles.length < 20) return null;
    const recent = candles.slice(-20);
    const highs  = recent.map((c) => c.high);
    const lows   = recent.map((c) => c.low);
    const high   = Math.max(...highs);
    const low    = Math.min(...lows);
    const range  = high - low;
    const vol    = recent.reduce((s, c) => s + c.volume, 0);
    const poc    = currentPrice; // Point of Control approximation
    const pocPct = range > 0 ? Math.min(99, Math.max(1, ((poc - low) / range) * 100)) : 50;
    const fvgGap = (range * 0.018).toFixed(2);
    const liqVal = (range * 0.032).toFixed(2);
    return { high, low, range, vol, poc, pocPct, fvgGap, liqVal };
  }, [candles, currentPrice]);

  // Trend matrix: 3 cols (FC, RD, EU) × 2 rows (FEMA, FEINS)
  // Bias derived from score breakdown
  const trendMatrix = useMemo(() => {
    const bull  = isBull;
    const score = Math.max(buyScore, sellScore);
    const strong = score > 15;
    return [
      // FC column
      [bull && strong, bull],
      // RD column
      [bull, bull || htfTrend === "bullish"],
      // EU column
      [htfTrend === "bullish", htfTrend !== "bearish"],
    ];
  }, [isBull, buyScore, sellScore, htfTrend]);

  const TF_COLS = [selectedTf, "1D", "1W"];
  const ROW_LABELS = ["FEMA", "FEINS"];

  // Now = timestamp formatted as HH:MM
  const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div style={{ borderTop: D, background: "#070a14" }}>

      {/* ══ TOP: SMC & VOLUME PROFILE ══════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: D }}>

        {/* ── Liquidity & Structure ── */}
        <div style={{ padding: "14px 16px", borderRight: D }}>
          <SectionTitle icon="●" title="SMC & Volume Profile" sub="Liquidity & Structure" />
          {smcData ? (
            <>
              <LiqRow
                label="Fair Values Gap (4H/H)"
                time={now}
              />
              <LiqRow
                label="Liquidity Gaming"
                value={`+${smcData.liqVal}`}
                valueColor={C.red}
                time={now}
              />
              <LiqRow
                label="MDX | Quantith"
                time={now}
              />
            </>
          ) : (
            <div style={{ color: T.dim, fontSize: 9, fontFamily: MX }}>Loading…</div>
          )}
        </div>

        {/* ── Volume Profile (POE) ── */}
        <div style={{ padding: "14px 16px" }}>
          <SectionTitle title="Volume Profile (POE)" />
          {smcData ? (
            <>
              <VolumeSlider
                label="PHC Curles"
                value={formatPrice(smcData.poc)}
                pct={smcData.pocPct}
              />
              <div style={{
                ...row(0), justifyContent: "space-between",
                padding: "5px 10px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 5,
              }}>
                <span style={{ fontFamily: MX, fontSize: 9, color: T.body }}>Orema</span>
                <span style={{ fontFamily: MX, fontSize: 9, fontWeight: 700, color: T.dim }}>
                  {Math.round(smcData.vol)}/10AL
                </span>
              </div>
            </>
          ) : (
            <div style={{ color: T.dim, fontSize: 9, fontFamily: MX }}>Loading…</div>
          )}
        </div>
      </div>

      {/* ══ BOTTOM: TREND MATRIX ════════════════════════════════════════════ */}
      <div style={{ padding: "14px 16px" }}>

        {/* Header */}
        <div style={{ ...row(10), marginBottom: 12 }}>
          <span style={{ color: C.cyan, fontSize: 10 }}>●</span>
          <span style={{
            fontFamily: MX, fontSize: 9, fontWeight: 800,
            letterSpacing: "0.18em", textTransform: "uppercase", color: C.cyan,
          }}>
            Trend Matrix
          </span>
          <span style={{
            fontFamily: MX, fontSize: 7.5, fontWeight: 700,
            letterSpacing: "0.12em", color: T.dim, textTransform: "uppercase",
          }}>
            Higher
          </span>
        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "80px repeat(3, 1fr)", gap: 6, marginBottom: 6 }}>
          <div />
          {TF_COLS.map((tf) => (
            <div key={tf} style={{
              textAlign: "center", fontFamily: MX, fontSize: 8,
              fontWeight: 700, color: T.dim, letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}>
              {tf}
            </div>
          ))}
        </div>

        {/* Matrix rows */}
        {ROW_LABELS.map((rowLabel, ri) => (
          <div key={rowLabel} style={{
            display: "grid", gridTemplateColumns: "80px repeat(3, 1fr)",
            gap: 6, marginBottom: 6,
          }}>
            {/* Row label */}
            <div style={{
              display: "flex", alignItems: "center",
              fontFamily: MX, fontSize: 8.5, fontWeight: 700,
              color: T.sub, letterSpacing: "0.1em",
            }}>
              {rowLabel}
            </div>
            {/* Cells */}
            {trendMatrix.map((col, ci) => (
              <TrendCell
                key={ci}
                isBull={col[ri]}
                label="CRAT"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
