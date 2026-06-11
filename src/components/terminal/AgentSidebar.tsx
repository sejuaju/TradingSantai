"use client";

import { useState } from "react";
import { C, D, T } from "./shared";
import type { Signal } from "./types";

const row = (g=0): React.CSSProperties => ({ display:"flex", alignItems:"center", gap:g });
const col = (g=0): React.CSSProperties => ({ display:"flex", flexDirection:"column", gap:g });
const MX  = "monospace";

interface Props {
  signals       : Signal[];
  isFullscreen ?: boolean;
}

// ─── Section header ───────────────────────────────────────────────────────────
function SideLabel({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ ...row(7), marginBottom:10, paddingBottom:7,
      borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
      <span style={{ color:C.cyan, fontSize:11 }}>{icon}</span>
      <span style={{ fontFamily:MX, fontSize:10, fontWeight:800,
        letterSpacing:"0.18em", textTransform:"uppercase" as const, color:T.body }}>
        {text}
      </span>
    </div>
  );
}

// ─── Key-value stat row ───────────────────────────────────────────────────────
function Stat({ label, value, color = T.body }: {
  label: string; value: string; color?: string;
}) {
  return (
    <div style={{ ...row(0), justifyContent:"space-between", padding:"4px 0" }}>
      <span style={{ fontFamily:MX, fontSize:10, color:T.dim }}>{label}</span>
      <span style={{ fontFamily:MX, fontSize:10, fontWeight:700, color }}>{value}</span>
    </div>
  );
}

// ─── Toggle button row ────────────────────────────────────────────────────────
function ToggleBtn({ label, on, onClick }: {
  label:string; on:boolean; onClick:()=>void;
}) {
  return (
    <button 
      onClick={onClick} 
      aria-pressed={on}
      aria-label={`Toggle ${label}`}
      style={{
        flex:1, padding:"8px 0", borderRadius:5, border:"none", cursor:"pointer",
        transition:"all 0.15s",
        background: on ? `${C.cyan}22` : "rgba(255,255,255,0.07)",
        color:      on ? C.cyan : T.sub,
        fontFamily:MX, fontSize:10, fontWeight:700,
        border_: on ? `1px solid ${C.cyan}44` : "1px solid rgba(255,255,255,0.10)",
      } as React.CSSProperties}>
      {label}
    </button>
  );
}

// ─── Risk mode pill ───────────────────────────────────────────────────────────
function RiskPill({ label, active, onClick }: {
  label:string; active:boolean; onClick:()=>void;
}) {
  return (
    <button 
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Set risk mode to ${label}`}
      style={{
        flex:1, padding:"7px 0", borderRadius:5, cursor:"pointer",
        border: active ? `1px solid ${C.cyan}55` : "1px solid rgba(255,255,255,0.10)",
        background: active ? `${C.cyan}18` : "rgba(255,255,255,0.04)",
        color:  active ? C.cyan : T.sub,
        fontFamily:MX, fontSize:10, fontWeight:700,
      }}>
      {label}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function AgentSidebar({
  signals,
  isFullscreen = false,
}: Props) {
  const [autoOn,   setAutoOn]   = useState(false);
  const [riskMode, setRiskMode] = useState<"NORMAL"|"SMART"|"OCA">("NORMAL");
  const [riskPct,  setRiskPct]  = useState(90);

  const win    = signals.filter(s => s.status === "win").length;
  const loss   = signals.filter(s => s.status === "loss").length;
  const closed = win + loss;
  const wr     = closed > 0 ? Math.round((win / closed) * 100) : 0;
  const active = signals.filter(s => s.status === "active");

  return (
    <aside 
      aria-label="Agent control panel"
      style={{
        width: isFullscreen ? "clamp(290px, 19vw, 380px)" : "270px",
        flexShrink:0, background:"#08090f", borderRight:D,
        fontFamily:MX, ...col(0), overflowY:"auto",
        transition:"width 0.3s ease",
      }} 
      className="no-scrollbar"
    >

      {/* ── 1. AGENT MONITOR ─────────────────────────────────────────────── */}
      <div style={{ padding:"14px 14px 12px" }}>
        <SideLabel icon="●" text="Agent Monitor" />

        {/* Signal summary */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:6, marginBottom:8 }}>
          {[
            { label:"ACTIVE",  val: active.length.toString(),  color:C.cyan  },
            { label:"WIN",     val: win.toString(),             color:C.green },
            { label:"LOSS",    val: loss.toString(),            color:C.red   },
            { label:"WIN RATE",val: closed>0?`${wr}%`:"—",     color:C.orange},
          ].map(s=>(
            <div key={s.label} style={{ padding:"8px 8px", borderRadius:6,
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(255,255,255,0.08)",
              display:"flex", flexDirection:"column" as const, gap:3, alignItems:"center" }}>
              <span style={{ fontSize:9, color:T.dim, fontFamily:MX,
                letterSpacing:"0.12em" }}>{s.label}</span>
              <span style={{ fontSize:18, fontWeight:800, color:s.color,
                fontFamily:MX, lineHeight:1 }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. MANUAL EXECUTION ─────────────────────────────────────────── */}
      <div style={{ padding:"10px 14px", borderTop:D }}>
        <SideLabel icon="★" text="Manual Execution" />

        <div style={{ ...row(6), marginBottom:10 }}>
          <button 
            aria-label="Sell BTC at current price"
            style={{ flex:1, padding:"10px 0", borderRadius:6, border:"none",
              background:"#dc2626", color:"white", fontSize:12, fontWeight:800,
              letterSpacing:"0.1em", cursor:"pointer",
              boxShadow:"0 0 14px rgba(220,38,38,0.3)" }}>SELL</button>
          <button 
            aria-label="Buy BTC at current price"
            style={{ flex:1, padding:"10px 0", borderRadius:6, border:"none",
              background:"#16a34a", color:"white", fontSize:12, fontWeight:800,
              letterSpacing:"0.1em", cursor:"pointer",
              boxShadow:"0 0 14px rgba(22,163,74,0.3)" }}>BUY</button>
        </div>

        <div style={{ ...row(0), justifyContent:"space-between", alignItems:"center",
          background:"rgba(255,255,255,0.05)", borderRadius:6,
          padding:"7px 12px", border:"1px solid rgba(255,255,255,0.10)",
          marginBottom:10 }}>
          <span style={{ fontSize:10, color:T.dim }}>TIPPLE</span>
          <span style={{ fontSize:13, fontWeight:700, color:T.main }}>0.001</span>
        </div>

        <div style={{ ...row(8) }}>
          {[
            { label:"GAMES", accent:C.red,   val:35 },
            { label:"GAINS", accent:C.green, val:65 },
          ].map(s => (
            <div key={s.label} style={{ ...col(5), flex:1, alignItems:"center" }}>
              <span style={{ fontSize:10, color:T.dim }}>{s.label}</span>
              <input type="range" min={0} max={100} defaultValue={s.val}
                style={{ width:"100%", accentColor:s.accent }}/>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. AUTOMATION & RISE ────────────────────────────────────────── */}
      <div style={{ padding:"10px 14px", borderTop:D }}>
        <SideLabel icon="⚙" text="Automation & Rise" />

        <div style={{ ...row(0), background:"rgba(255,255,255,0.05)",
          border:"1px solid rgba(255,255,255,0.10)", borderRadius:6,
          padding:"7px 12px", marginBottom:8 }}>
          <span style={{ fontSize:10, color:T.sub, flex:1 }}>TRADED EXCLUSIVE</span>
          <span style={{ fontSize:10, fontWeight:700, color:C.cyan }}>ZBWALY9G09 ▼</span>
        </div>

        <div style={{ ...row(6), marginBottom:8 }}>
          <ToggleBtn label={autoOn ? "ATY-ON" : "ATY-OFF"} on={autoOn}
            onClick={() => setAutoOn(p => !p)}/>
          <button 
            aria-label="Configure trail settings"
            style={{ flex:1, padding:"8px 0", borderRadius:5, cursor:"pointer",
              border:"1px solid rgba(255,255,255,0.15)",
              background:"rgba(255,255,255,0.04)", color:T.sub,
              fontFamily:MX, fontSize:10, fontWeight:700 }}>TRAIL #77</button>
        </div>

        <div style={{ ...row(4), marginBottom:8 }}>
          {["20","60","0"].map((n,i) => (
            <div key={i} style={{ flex:1, textAlign:"center", padding:"6px 0",
              background:"rgba(255,255,255,0.05)", borderRadius:4,
              border:"1px solid rgba(255,255,255,0.10)",
              fontSize:13, fontWeight:700, color:T.main }}>{n}</div>
          ))}
        </div>

        <div style={{ ...row(7), marginBottom:8 }}>
          <div style={{ width:14, height:14, borderRadius:3,
            background: autoOn ? C.green : "rgba(255,255,255,0.10)",
            border: autoOn ? "none" : "1px solid rgba(255,255,255,0.22)",
            flexShrink:0 }}/>
          <span style={{ fontSize:10, color:T.sub }}>RETH HORD BRD GAT A CARGO</span>
        </div>

        <div style={{ ...row(8), marginBottom:8, alignItems:"center" }}>
          <label htmlFor="risk-slider" style={{ fontSize:10, color:T.sub, flexShrink:0 }}>
            WE GIVE
          </label>
          <input 
            id="risk-slider"
            type="range" 
            min={0} 
            max={100} 
            value={riskPct}
            onChange={e => setRiskPct(+e.target.value)}
            aria-label="Risk percentage slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={riskPct}
            style={{ flex:1, accentColor:C.purple }}/>
          <span 
            style={{ fontSize:13, fontWeight:800, color:C.purple, flexShrink:0 }}
            aria-live="polite"
          >
            {riskPct}
          </span>
        </div>

        <div style={{ ...row(4) }}>
          {(["NORMAL","SMART","OCA"] as const).map(m => (
            <RiskPill key={m} label={m} active={riskMode===m}
              onClick={() => setRiskMode(m)}/>
          ))}
        </div>
      </div>

      {/* ── 4. FLASK MODERYON ───────────────────────────────────────────── */}
      <div style={{ padding:"10px 14px", borderTop:D, flex:1 }}>
        <SideLabel icon="⚡" text="Flask Moderyon (DB)" />

        <div style={{ ...row(0), justifyContent:"space-between", marginBottom:12 }}>
          {[
            { label:"BAKE SPEED", val: signals.length > 0 ? `${signals.length}/s` : "10/s", color:C.cyan   },
            { label:"CHECKSUM",   val: wr > 0 ? `${wr}%` : "—",                             color:C.orange },
          ].map(s => (
            <div key={s.label} style={{ ...col(4), alignItems:"center" }}>
              <span style={{ fontSize:10, color:T.dim }}>{s.label}</span>
              <span style={{ fontSize:24, fontWeight:800, color:s.color,
                textShadow:`0 0 14px ${s.color}44` }}>{s.val}</span>
            </div>
          ))}
        </div>

        <Stat label="WIN"    value={win.toString()}            color={C.green} />
        <Stat label="LOSS"   value={loss.toString()}           color={C.red}   />
        <Stat label="ACTIVE" value={active.length.toString()}  color={C.blue}  />
        <Stat label="CLOSED" value={closed.toString()}         color={T.sub}   />

        <button 
          aria-label="Clear all data"
          style={{ marginTop:12, width:"100%", padding:"8px 0",
            borderRadius:6, border:"1px solid rgba(255,255,255,0.12)",
            background:"rgba(255,255,255,0.06)", color:T.body,
            fontSize:10, fontWeight:700, letterSpacing:"0.15em",
            cursor:"pointer" }}>CLCAR</button>
      </div>

    </aside>
  );
}
