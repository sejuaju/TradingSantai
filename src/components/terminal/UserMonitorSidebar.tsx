"use client";

import { useState, useMemo } from "react";
import { C, CHART_LINES, D, T } from "./shared";
import type { Signal } from "./types";
import type { Instrument } from "./config";
import { PIP_SIZE_BY_CATEGORY, TRADING_CONFIG } from "./config";
import { ProfileMonitorHeader } from "./ProfileMonitorHeader";

const MX  = "monospace";
const col = (gap = 0): React.CSSProperties => ({ display: "flex", flexDirection: "column", gap });
const row = (gap = 0): React.CSSProperties => ({ display: "flex", alignItems: "center", gap });

const INITIAL_CAPITAL  = TRADING_CONFIG.INITIAL_CAPITAL;
const LEVERAGE_OPTIONS = [5, 10, 20, 50];
const LOT_UNIT = TRADING_CONFIG.LOT_UNIT;

interface Props {
  signals      : Signal[];
  userSignals ?: Signal[];
  currentPrice : number;
  formatPrice  : (p: number) => string;
  instrument   : Instrument;
  isFullscreen ?: boolean;
}

function calcPositionSize(entryPrice: number, leverage: number): number {
  if (entryPrice <= 0) return 0;
  return (INITIAL_CAPITAL * leverage) / entryPrice;
}

function calcSignalPnl(s: Signal, price: number, leverage: number, pipSize: number) {
  const posSize  = calcPositionSize(s.price, leverage);
  const lots     = posSize / LOT_UNIT;
  const pipValue = posSize * pipSize;
  const diff     = s.type === "BUY" ? price - s.price : s.price - price;
  const pips     = pipSize > 0 ? diff / pipSize : 0;
  const pnlUsd   = posSize * diff;
  const pnlPct   = (pnlUsd / INITIAL_CAPITAL) * 100;
  return { pnlUsd, pnlPct, posSize, lots, pipValue, pips };
}

function useAccountMetrics(signals: Signal[], currentPrice: number, leverage: number, pipSize: number) {
  return useMemo(() => {
    let realizedPnl = 0;
    signals.filter(s => s.status === "win" || s.status === "loss").forEach(s => {
      const posSize = calcPositionSize(s.price, leverage);
      if (s.status === "win")  realizedPnl += posSize * Math.abs(s.tp - s.price);
      if (s.status === "loss") realizedPnl -= posSize * Math.abs(s.sl - s.price);
    });

    let unrealizedPnl = 0;
    signals.filter(s => s.status === "active").forEach(s => {
      const { pnlUsd } = calcSignalPnl(s, currentPrice, leverage, pipSize);
      unrealizedPnl += pnlUsd;
    });

    const activeCount = signals.filter(s => s.status === "active").length;
    const marginUsed  = activeCount > 0 ? INITIAL_CAPITAL : 0;
    const balance     = INITIAL_CAPITAL + realizedPnl;
    const equity      = balance + unrealizedPnl;
    const freeMargin  = Math.max(0, equity - marginUsed);
    const returnPct   = ((equity - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;
    const marginLvl   = marginUsed > 0 ? Math.round((equity / marginUsed) * 100) : 0;

    return { equity, balance, marginUsed, freeMargin, realizedPnl, unrealizedPnl, returnPct, marginLvl };
  }, [signals, currentPrice, leverage, pipSize]);
}

// ─── Section header ───────────────────────────────────────────────────────────
function SideLabel({ icon, text, color = C.orange }: { icon:string; text:string; color?:string }) {
  return (
    <div style={{ ...row(8), marginBottom:12, paddingBottom:8,
      borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
      <span style={{ color, fontSize:12 }}>{icon}</span>
      <span style={{ fontFamily:MX, fontSize:11, fontWeight:800,
        letterSpacing:"0.18em", textTransform:"uppercase" as const, color:T.body }}>
        {text}
      </span>
    </div>
  );
}

function Toggle({ on, onToggle }: { on:boolean; onToggle:()=>void }) {
  return (
    <div onClick={onToggle} style={{ width:34, height:19, borderRadius:10, cursor:"pointer",
      background:on?C.green:"rgba(255,255,255,0.14)",
      position:"relative", transition:"background 0.2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:3, left:on?18:3,
        width:13, height:13, borderRadius:"50%", background:"white",
        transition:"left 0.2s", boxShadow:on?`0 0 6px ${C.green}`:"none" }}/>
    </div>
  );
}

// ─── Blur row (EQUITY / BALANCE / MARGIN / FREE MAR) ─────────────────────────
function BlurRow({ label, value, color = T.sub }: { label:string; value:string; color?:string }) {
  return (
    <div style={{ ...row(0), justifyContent:"space-between", padding:"6px 0" }}>
      <span style={{ fontFamily:MX, fontSize:11, color:T.dim, letterSpacing:"0.1em" }}>
        {label}
      </span>
      <span style={{ fontFamily:MX, fontSize:12, fontWeight:700, color }}>
        {value}
      </span>
    </div>
  );
}

// ─── Summary stat row ─────────────────────────────────────────────────────────
function Stat({ label, value, color = T.body }: { label:string; value:string; color?:string }) {
  return (
    <div style={{ ...row(0), justifyContent:"space-between", padding:"5px 0" }}>
      <span style={{ fontFamily:MX, fontSize:11, color:T.dim, letterSpacing:"0.1em" }}>
        {label}
      </span>
      <span style={{ fontFamily:MX, fontSize:11, fontWeight:700, color }}>{value}</span>
    </div>
  );
}

// ─── Leverage Selector ────────────────────────────────────────────────────────
function LeverageSelector({ value, onChange, currentPrice, activeSignals }: {
  value:number; onChange:(v:number)=>void; currentPrice:number; activeSignals:Signal[];
}) {
  // Jika ada posisi open: hitung nilai real berdasarkan harga entry
  // Jika tidak ada: tampilkan nilai hypothetical (selalu = modal × leverage)
  const currentPosValue = activeSignals.length > 0
    ? activeSignals.reduce((sum, s) => {
        const posSizeBtc = (INITIAL_CAPITAL * value) / s.price; // BTC fixed saat entry
        return sum + posSizeBtc * currentPrice;                 // nilai sekarang
      }, 0)
    : INITIAL_CAPITAL * value; // hypothetical — memang selalu fixed (20 × leverage)
  return (
    <div style={{ ...col(8) }}>
      {/* Header row */}
      <div style={{ ...row(8) }}>
        <span style={{ fontFamily:MX, fontSize:11, fontWeight:700,
          letterSpacing:"0.14em", color:T.dim }}>LEVERAGE</span>
        <span style={{ fontFamily:MX, fontSize:14, fontWeight:800, color:C.orange }}>
          ×{value}
        </span>
        <div style={{ marginLeft:"auto", ...col(2), alignItems:"flex-end" }}>
          <div style={{ ...row(5) }}>
            {activeSignals.length > 0 && (
              <span style={{ fontFamily:MX, fontSize:8, fontWeight:800,
                color:C.green, background:`${C.green}20`,
                padding:"1px 5px", borderRadius:3,
                border:`1px solid ${C.green}40` }}>LIVE</span>
            )}
            <span style={{ fontFamily:MX, fontSize:10,
              color: activeSignals.length > 0 ? C.cyan : T.dim }}>
              ${currentPosValue.toFixed(2)}
            </span>
          </div>
          <span style={{ fontFamily:MX, fontSize:8, color:T.dim }}>
            {activeSignals.length > 0 ? "pos. value" : "hypothetical"}
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5 }}>
        {LEVERAGE_OPTIONS.map(lv => {
          const active = lv === value;
          return (
            <button key={lv} onClick={() => onChange(lv)} style={{
              padding:"6px 0", borderRadius:7, cursor:"pointer",
              fontFamily:MX, fontSize:12, fontWeight:800,
              border:`1px solid ${active ? C.orange+"66" : "rgba(255,255,255,0.12)"}`,
              background:active ? `${C.orange}22` : "rgba(255,255,255,0.04)",
              color:active ? C.orange : T.dim,
              transition:"all 0.15s",
            }}>
              {lv}×
            </button>
          );
        })}
      </div>

      {/* Risk note */}
      <div style={{ padding:"6px 10px", borderRadius:6,
        background:value >= 20 ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.03)",
        border:`1px solid ${value >= 20 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)"}` }}>
        <span style={{ fontFamily:MX, fontSize:10,
          color:value >= 20 ? "#f87171" : T.dim }}>
          {value >= 50 ? "⚠ Leverage sangat tinggi — risiko besar"
          : value >= 20 ? "⚠ Leverage tinggi — kelola risiko"
          : `Risiko per 1% move: $${(INITIAL_CAPITAL * value * 0.01).toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}

// ─── Position card ────────────────────────────────────────────────────────────
function PositionRow({ s, currentPrice, formatPrice, leverage, symbolLabel, pipSize }: {
  s:Signal; currentPrice:number; formatPrice:(p:number)=>string; leverage:number;
  symbolLabel:string; pipSize:number;
}) {
  const { pnlUsd, pnlPct, lots, pipValue, pips } = calcSignalPnl(s, currentPrice, leverage, pipSize);
  const isBuy    = s.type === "BUY";
  const accent   = isBuy ? C.green : C.red;
  const pnlColor = pnlUsd >= 0 ? C.green : C.red;
  const pnlSign  = pnlUsd >= 0 ? "+" : "-";
  const pipSign  = pips   >= 0 ? "+" : "-";

  const tpDist  = Math.abs(s.tp - s.price);
  const curDist = isBuy ? currentPrice - s.price : s.price - currentPrice;
  const prog    = tpDist > 0 ? Math.max(-100, Math.min(100, (curDist / tpDist) * 100)) : 0;

  return (
    <div style={{ padding:"12px 13px", marginBottom:8, borderRadius:10,
      background:`${accent}0a`, border:`1px solid ${accent}30` }}>

      {/* Row 1: Badge + Symbol + PnL */}
      <div style={{ ...row(9), marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:800, fontFamily:MX,
          color:accent, background:`${accent}20`, padding:"3px 9px",
          borderRadius:5, border:`1px solid ${accent}44`, letterSpacing:"0.1em" }}>
          {s.type}
        </span>
        <div style={{ ...col(2), gap: 2 }}>
          <span style={{ fontSize:12, fontWeight:700, color:T.sub, fontFamily:MX }}>
            {symbolLabel}
          </span>
          {s.entryTimeframe && (
            <span style={{ fontSize:9, fontWeight:700, fontFamily:MX, color:C.cyan,
              letterSpacing:"0.08em" }}>
              Entry: {s.entryTimeframe}
            </span>
          )}
        </div>
        <div style={{ marginLeft:"auto", ...col(2), alignItems:"flex-end" }}>
          <span style={{ fontSize:15, fontWeight:800, fontFamily:MX,
            color:pnlColor, textShadow:`0 0 10px ${pnlColor}55` }}>
            {pnlSign}${Math.abs(pnlUsd).toFixed(4)}
          </span>
          <span style={{ fontSize:10, fontFamily:MX, color:pnlColor, opacity:0.8 }}>
            {pnlSign}{Math.abs(pnlPct).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Lot / Pip / Pips P/L */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5, marginBottom:8 }}>
        {[
          { l:"LOT SIZE",  v:lots.toFixed(2),                              c:T.body   },
          { l:"PIP VALUE", v:`$${pipValue.toFixed(4)}`,                    c:C.cyan   },
          { l:"PIPS P/L",  v:`${pipSign}${Math.abs(pips).toFixed(1)}`,     c:pnlColor },
        ].map(({ l,v,c }) => (
          <div key={l} style={{ ...col(3), alignItems:"center", padding:"6px 4px",
            borderRadius:6, background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize:9, color:T.dim, fontFamily:MX,
              letterSpacing:"0.10em", textTransform:"uppercase" as const }}>{l}</span>
            <span style={{ fontSize:12, fontWeight:700, color:c, fontFamily:MX }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Progress bar entry→TP */}
      <div style={{ marginBottom:8 }}>
        <div style={{ height:4, borderRadius:99,
          background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:99,
            width:`${Math.abs(prog)}%`,
            background: prog >= 0
              ? `linear-gradient(90deg,${accent}55,${accent})`
              : `linear-gradient(90deg,${C.red}55,${C.red})`,
            transition:"width 0.5s ease" }} />
        </div>
        <div style={{ ...row(0), justifyContent:"space-between", marginTop:4 }}>
          <span style={{ fontFamily:MX, fontSize:10, color:T.dim }}>ENTRY</span>
          <span style={{ fontFamily:MX, fontSize:10, fontWeight:700, color:pnlColor }}>
            {prog.toFixed(0)}% to TP
          </span>
          <span style={{ fontFamily:MX, fontSize:10, color:CHART_LINES.tp }}>TP</span>
        </div>
      </div>

      {/* ENTRY / TP / SL */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5 }}>
        {[
          { l:"ENTRY", v:formatPrice(s.price), c:T.body  },
          { l:"TP",    v:formatPrice(s.tp),    c:CHART_LINES.tp },
          { l:"SL",    v:formatPrice(s.sl),    c:C.red   },
        ].map(({ l,v,c }) => (
          <div key={l} style={{ ...col(3), alignItems:"center", padding:"6px 4px",
            borderRadius:6, background:"rgba(255,255,255,0.05)",
            border:"1px solid rgba(255,255,255,0.09)" }}>
            <span style={{ fontSize:10, color:T.dim, fontFamily:MX,
              letterSpacing:"0.12em" }}>{l}</span>
            <span style={{ fontSize:11, fontWeight:700, color:c, fontFamily:MX }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function UserMonitorSidebar({
  signals,
  userSignals,
  currentPrice,
  formatPrice,
  instrument,
  isFullscreen = false,
}: Props) {
  const [cubityOn, setCubityOn] = useState(true);
  const [leverage, setLeverage] = useState(10);

  const symbolLabel = instrument.description || instrument.symbol;
  const pipSize     = PIP_SIZE_BY_CATEGORY[instrument.category] ?? 0.01;
  const accountSignals = userSignals ?? signals;

  const {
    equity, balance, marginUsed, freeMargin,
    realizedPnl, returnPct, marginLvl,
  } = useAccountMetrics(accountSignals, currentPrice, leverage, pipSize);

  const active  = signals.filter(s => s.status === "active");
  const win     = accountSignals.filter(s => s.status === "win").length;
  const loss    = accountSignals.filter(s => s.status === "loss").length;
  const closed  = win + loss;
  const wr      = closed > 0 ? ((win / closed) * 100).toFixed(1) : "0.0";

  const fmt = (v: number) => "$" + Math.abs(v).toFixed(2);

  return (
    <div className="no-scrollbar" style={{
      width: isFullscreen ? "clamp(290px, 19vw, 380px)" : "270px",
      flexShrink:0, background:"#08090f", borderLeft:D,
      fontFamily:MX, ...col(0), overflowY:"auto",
      transition:"width 0.3s ease",
    }}>

      {/* ══ 1. MASTER USER MONITOR ══════════════════════════════════════════ */}
      <div style={{ padding:"14px 14px 12px" }}>
        <SideLabel icon="●" text="Master User Monitor" color={C.orange} />

        <ProfileMonitorHeader returnPct={returnPct} />

        {/* Account values card */}
        <div style={{ background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.09)",
          borderRadius:9, padding:"10px 13px", marginBottom:9 }}>
          <BlurRow label="EQUITY"   value={fmt(equity)}     color={C.cyan}   />
          <BlurRow label="BALANCE"  value={fmt(balance)}    color={T.body}   />
          <BlurRow label="MARGIN"   value={fmt(marginUsed)} color={C.orange} />
          <BlurRow label="FREE MAR" value={fmt(freeMargin)} color={T.dim}    />
          {marginLvl > 0 && (
            <div style={{ ...row(0), justifyContent:"space-between",
              padding:"6px 0", borderTop:"1px solid rgba(255,255,255,0.06)", marginTop:4 }}>
              <span style={{ fontFamily:MX, fontSize:11, color:T.dim }}>MARGIN LVL</span>
              <span style={{ fontFamily:MX, fontSize:12, fontWeight:800,
                color: marginLvl > 200 ? C.green : marginLvl > 120 ? C.orange : C.red }}>
                {marginLvl}%
              </span>
            </div>
          )}
        </div>

        {/* Modal awal + Realized row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:9 }}>
          {[
            { l:"MODAL AWAL", v:`$${INITIAL_CAPITAL.toFixed(2)}`, c:T.body },
            { l:"REALIZED",   v:`${realizedPnl >= 0 ? "+" : ""}${fmt(realizedPnl)}`,
              c: realizedPnl >= 0 ? C.green : C.red },
          ].map(({ l,v,c }) => (
            <div key={l} style={{ ...col(4), padding:"8px 11px", borderRadius:8,
              background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontFamily:MX, fontSize:10, color:T.dim,
                letterSpacing:"0.12em" }}>{l}</span>
              <span style={{ fontFamily:MX, fontSize:13, fontWeight:800, color:c }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Leverage selector */}
        <div style={{ padding:"11px 13px", borderRadius:9,
          background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.09)", marginBottom:9 }}>
          <LeverageSelector value={leverage} onChange={setLeverage} currentPrice={currentPrice} activeSignals={active} />
        </div>

        {/* CUBITY LOOSE toggle */}
        <div style={{ ...row(0), justifyContent:"space-between",
          background:"rgba(255,255,255,0.04)",
          border:"1px solid rgba(255,255,255,0.09)",
          borderRadius:9, padding:"10px 13px" }}>
          <span style={{ fontSize:11, fontWeight:700,
            letterSpacing:"0.14em", color:T.sub, fontFamily:MX }}>
            CUBITY LOOSE
          </span>
          <Toggle on={cubityOn} onToggle={() => setCubityOn(p => !p)} />
        </div>
      </div>

      {/* ══ 2. OPEN POSITIONS ═══════════════════════════════════════════════ */}
      <div style={{ padding:"10px 14px", borderTop:D, flex:1 }}>

        {/* Section header */}
        <div style={{ ...row(0), justifyContent:"space-between",
          marginBottom:12, paddingBottom:8,
          borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ ...row(8) }}>
            <span style={{ color:C.orange, fontSize:12 }}>●</span>
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:"0.18em",
              textTransform:"uppercase" as const, color:T.body, fontFamily:MX }}>
              Open Positions
            </span>
            {active.length > 0 && (
              <span style={{ fontSize:10, fontWeight:800, fontFamily:MX,
                color:C.cyan, background:`${C.cyan}20`, padding:"2px 7px",
                borderRadius:4, border:`1px solid ${C.cyan}35` }}>
                {active.length}
              </span>
            )}
          </div>
          <button style={{ width:24, height:24, borderRadius:6,
            border:"1px solid rgba(255,255,255,0.15)",
            background:"rgba(255,255,255,0.07)",
            color:T.body, fontSize:17, lineHeight:1, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontFamily:MX }}>
            +
          </button>
        </div>

        {/* Empty state */}
        {active.length === 0 ? (
          <div style={{ ...col(9), alignItems:"center", justifyContent:"center",
            padding:"24px 12px", border:"1px dashed rgba(255,255,255,0.15)",
            borderRadius:9, background:"rgba(255,255,255,0.03)" }}>
            <span style={{ fontSize:24, color:C.orange, opacity:0.6 }}>◈</span>
            <span style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.70)",
              letterSpacing:"0.14em", textTransform:"uppercase" as const,
              textAlign:"center" as const, fontFamily:MX }}>
              No Open Positions
            </span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.38)",
              textAlign:"center" as const, lineHeight:1.5, fontFamily:MX }}>
              Waiting for active signals
            </span>
          </div>
        ) : (
          active.map((s) => (
            <PositionRow key={`${s.time}-${s.type}-${s.instrumentId ?? "x"}`} s={s}
              currentPrice={currentPrice}
              formatPrice={formatPrice}
              leverage={leverage}
              symbolLabel={symbolLabel}
              pipSize={pipSize} />
          ))
        )}

        {/* Summary stats */}
        {(closed > 0 || active.length > 0) && (
          <div style={{ marginTop:9, padding:"10px 13px", borderRadius:9,
            background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.08)" }}>
            <Stat label="OPEN"     value={active.length.toString()} color={C.cyan}  />
            <Stat label="WIN RATE" value={`${wr}%`}                 color={C.green} />
            <Stat label="WIN"      value={win.toString()}            color={C.green} />
            <Stat label="LOSS"     value={loss.toString()}           color={C.red}   />
            <Stat label="TOTAL"    value={accountSignals.length.toString()} color={T.sub}   />
          </div>
        )}
      </div>
    </div>
  );
}
