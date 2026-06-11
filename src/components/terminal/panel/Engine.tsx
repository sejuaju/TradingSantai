"use client";

import { C } from "../shared";

const row = (gap=0): React.CSSProperties => ({ display:"flex", alignItems:"center", gap });
const col = (gap=0): React.CSSProperties => ({ display:"flex", flexDirection:"column", gap });
const MX  = "monospace";

const T = {
  sub  : "rgba(255,255,255,0.62)",
  body : "rgba(255,255,255,0.82)",
};

export interface BarData {
  value : number;
  label : string;
  color : string;
}

interface Props {
  gaugeVal : number;
  bias     : "BUY" | "SELL" | "NEUTRAL";
  bars     : BarData[];
}

function SLabel({ text }: { text: string }) {
  return (
    <div style={{ ...row(6), marginBottom:12 }}>
      <span style={{ color:C.purple, fontSize:11 }}>●</span>
      <span style={{ fontFamily:MX, fontSize:9, fontWeight:700, letterSpacing:"0.22em",
        textTransform:"uppercase", color:T.body }}>
        {text}
      </span>
    </div>
  );
}

function RingGauge({ value, bias }: { value:number; bias:"BUY"|"SELL"|"NEUTRAL" }) {
  const cx=56, cy=56, r=42, sw=7;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(value, 100) / 100) * circ;
  const color = bias==="BUY" ? C.green : bias==="SELL" ? C.red : C.purple;
  const label = bias==="BUY" ? "BULLISH" : bias==="SELL" ? "BEARISH" : "NEUTRAL";

  return (
    <svg width="112" height="112" viewBox="0 0 112 112" style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={r+6} fill="none" stroke={color} strokeWidth={2} opacity="0.10"/>
      <circle cx={cx} cy={cy} r={r}   fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={sw}/>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const a = t * 2 * Math.PI - Math.PI / 2;
        return <line key={i}
          x1={cx+(r-6)*Math.cos(a)} y1={cy+(r-6)*Math.sin(a)}
          x2={cx+(r+6)*Math.cos(a)} y2={cy+(r+6)*Math.sin(a)}
          stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>;
      })}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter:`drop-shadow(0 0 6px ${color}88)`, transition:"stroke-dasharray 0.7s ease" }}/>
      <text x={cx} y={cy-2} textAnchor="middle" fill="white"
        fontSize="26" fontWeight="bold" fontFamily="monospace">{value}</text>
      <text x={cx} y={cy+15} textAnchor="middle" fill={color}
        fontSize="9.5" fontWeight="bold" fontFamily="monospace" letterSpacing="2">{label}</text>
    </svg>
  );
}

function MiniBar({ value, label, color }: BarData) {
  const maxH = 60;
  const barH = Math.max(6, (Math.min(value, 100) / 100) * maxH);
  return (
    <div style={{ ...col(5), alignItems:"center" }}>
      <span style={{ fontFamily:MX, fontSize:15, fontWeight:700, color }}>{value}</span>
      <div style={{ display:"flex", alignItems:"flex-end", height:maxH }}>
        <div style={{
          width:14, height:barH, borderRadius:3,
          background:`linear-gradient(to top, ${color}, ${color}66)`,
          boxShadow:`0 0 8px ${color}66`,
        }}/>
      </div>
      <span style={{ fontFamily:MX, fontSize:8.5, textTransform:"uppercase",
        textAlign:"center", color:T.sub, lineHeight:1.3 }}>{label}</span>
    </div>
  );
}

// ── No borderRight — parent/grid manages column separators ──────────────────────
export function Engine({ gaugeVal, bias, bars }: Props) {
  return (
    <div style={{ padding:"16px 20px" }}>
      <SLabel text="Signal Engine" />
      <div style={{ ...row(24), alignItems:"center" }}>
        <RingGauge value={gaugeVal} bias={bias}/>
        <div style={{ display:"flex", alignItems:"flex-end", gap:20, paddingBottom:4 }}>
          {bars.map((b) => <MiniBar key={b.label} {...b}/>)}
        </div>
      </div>
    </div>
  );
}
