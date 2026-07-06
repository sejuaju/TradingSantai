"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthTrigger from "@/components/auth/AuthTrigger";
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

// ─── Slider dengan label & hint (Manual) ─────────────────────────────────────
function ManualSlider({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  format,
  accent,
  disabled,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  accent: string;
  disabled?: boolean;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div style={{ ...col(6), opacity: disabled ? 0.45 : 1 }}>
      <div style={{ ...row(0), justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.body }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: accent }}>{format(value)}</span>
      </div>
      <div style={{
        position: "relative", height: 6, borderRadius: 3,
        background: "rgba(255,255,255,0.08)", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`,
          background: accent, borderRadius: 3, opacity: 0.85,
        }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(+e.target.value)}
          aria-label={label}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            opacity: 0, cursor: disabled ? "not-allowed" : "pointer", margin: 0,
          }}
        />
      </div>
      <span style={{ fontSize: 9, color: T.dim, lineHeight: 1.35 }}>{hint}</span>
    </div>
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
  const { user, loading: authLoading } = useAuth();
  const canExecute = !!user;
  const [autoOn,   setAutoOn]   = useState(false);
  const [riskMode, setRiskMode] = useState<"NORMAL"|"SMART"|"OCA">("NORMAL");
  const [riskPct,  setRiskPct]  = useState(90);
  const [lotSize]               = useState(0.001);
  const [tradeRiskPct, setTradeRiskPct] = useState(2);
  const [rewardRatio, setRewardRatio]   = useState(2);

  const win    = signals.filter(s => s.status === "win").length;
  const loss   = signals.filter(s => s.status === "loss").length;
  const closed = win + loss;
  const wr     = closed > 0 ? Math.round((win / closed) * 100) : 0;
  const active = signals.filter(s => s.status === "active");

  return (
    <aside 
      aria-label="Panel kontrol agen trading"
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
        <SideLabel icon="●" text="Monitor Agen" />

        {/* Signal summary */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:6, marginBottom:8 }}>
          {[
            { label:"AKTIF",    val: active.length.toString(), color:C.cyan  },
            { label:"MENANG",   val: win.toString(),           color:C.green },
            { label:"KALAH",    val: loss.toString(),          color:C.red   },
            { label:"WIN RATE", val: closed>0?`${wr}%`:"—",    color:C.orange},
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

      {/* ── 2. EKSEKUSI MANUAL ──────────────────────────────────────────── */}
      <div style={{ padding:"10px 14px", borderTop:D }}>
        <SideLabel icon="★" text="Eksekusi Manual" />

        {!authLoading && !canExecute && (
          <div style={{
            marginBottom:10, padding:"10px 12px", borderRadius:8,
            background:"rgba(99,102,241,0.10)", border:"1px solid rgba(99,102,241,0.25)",
            ...col(6),
          }}>
            <div style={{ ...row(6), alignItems:"center" }}>
              <Lock size={12} color={C.purple} />
              <span style={{ fontSize:10, color:T.body, fontWeight:700 }}>
                Login diperlukan
              </span>
            </div>
            <span style={{ fontSize:9, color:T.dim, lineHeight:1.45 }}>
              Chart dan sinyal tetap terbuka. Login akun Trading Santai untuk tombol Beli/Jual manual.
            </span>
            <AuthTrigger
              mode="login"
              style={{
                display:"inline-block", marginTop:2, fontSize:10, fontWeight:700,
                color:C.cyan, textDecoration:"none", background:"none", border:"none",
                padding:0, cursor:"pointer", fontFamily:"inherit",
              }}
            >
              Login sekarang →
            </AuthTrigger>
          </div>
        )}

        <div style={{
          ...col(10),
          padding:10, borderRadius:8,
          background:"rgba(255,255,255,0.03)",
          border:"1px solid rgba(255,255,255,0.08)",
          opacity: canExecute ? 1 : 0.45,
        }}>
          <div style={{ ...row(6) }}>
            <button
              aria-label="Jual di harga saat ini"
              disabled={!canExecute}
              style={{
                flex:1, padding:"11px 0", borderRadius:7, border:"none",
                background: canExecute ? "linear-gradient(180deg,#ef4444,#dc2626)" : "#7f1d1d",
                color:"white", fontSize:12, fontWeight:800,
                letterSpacing:"0.06em", cursor: canExecute ? "pointer" : "not-allowed",
                boxShadow: canExecute ? "0 4px 14px rgba(220,38,38,0.28)" : "none",
              }}
            >
              JUAL
            </button>
            <button
              aria-label="Beli di harga saat ini"
              disabled={!canExecute}
              style={{
                flex:1, padding:"11px 0", borderRadius:7, border:"none",
                background: canExecute ? "linear-gradient(180deg,#22c55e,#16a34a)" : "#14532d",
                color:"white", fontSize:12, fontWeight:800,
                letterSpacing:"0.06em", cursor: canExecute ? "pointer" : "not-allowed",
                boxShadow: canExecute ? "0 4px 14px rgba(22,163,74,0.28)" : "none",
              }}
            >
              BELI
            </button>
          </div>

          <div style={{
            ...row(0), justifyContent:"space-between", alignItems:"center",
            padding:"8px 10px", borderRadius:6,
            background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={col(2)}>
              <span style={{ fontSize:9, color:T.dim, letterSpacing:"0.08em" }}>UKURAN LOT</span>
              <span style={{ fontSize:9, color:T.mute }}>Volume per klik</span>
            </div>
            <span style={{ fontSize:14, fontWeight:800, color:C.cyan }}>{lotSize}</span>
          </div>

          <ManualSlider
            label="Risiko per Trade"
            hint="Batas kerugian maksimal jika stop loss kena (% dari modal)."
            value={tradeRiskPct}
            onChange={setTradeRiskPct}
            min={0.5}
            max={5}
            step={0.5}
            format={(v) => `${v}%`}
            accent={C.red}
            disabled={!canExecute}
          />

          <ManualSlider
            label="Target Risk : Reward"
            hint="Perbandingan jarak TP vs SL. Contoh 1:2 = TP dua kali lebih jauh dari SL."
            value={rewardRatio}
            onChange={setRewardRatio}
            min={1}
            max={5}
            step={0.5}
            format={(v) => `1 : ${v}`}
            accent={C.green}
            disabled={!canExecute}
          />

          <div style={{
            padding:"8px 10px", borderRadius:6,
            background:"rgba(0,212,232,0.06)", border:"1px solid rgba(0,212,232,0.14)",
            ...col(4),
          }}>
            <span style={{ fontSize:9, color:T.dim, letterSpacing:"0.06em" }}>RINGKASAN SETUP</span>
            <span style={{ fontSize:10, color:T.sub, lineHeight:1.45 }}>
              Risiko <strong style={{ color:C.red }}>{tradeRiskPct}%</strong> modal
              {" · "}
              Target <strong style={{ color:C.green }}>1:{rewardRatio}</strong>
              {" · "}
              Lot <strong style={{ color:C.cyan }}>{lotSize}</strong>
            </span>
            <span style={{ fontSize:9, color:T.mute, lineHeight:1.35 }}>
              Tombol Beli/Jual akan memakai parameter ini saat eksekusi manual diaktifkan.
            </span>
          </div>
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
