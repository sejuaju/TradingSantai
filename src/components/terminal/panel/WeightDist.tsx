"use client";

import { WEIGHT_MAP } from "../shared";
import type { ScoreItem } from "../indicators";

const row = (gap=0): React.CSSProperties => ({ display:"flex", alignItems:"center", gap });
const MX  = "monospace";

const T = {
  sub  : "rgba(255,255,255,0.62)",
  body : "rgba(255,255,255,0.82)",
};

interface Props {
  items       : ScoreItem[];
  biasDisplay : string;
  biasColor   : string;
}

function SLabel({ text }: { text: string }) {
  return (
    <div style={{ ...row(6), marginBottom:12 }}>
      <span style={{ color:"#f97316", fontSize:11 }}>●</span>
      <span style={{ fontFamily:MX, fontSize:9, fontWeight:700, letterSpacing:"0.22em",
        textTransform:"uppercase", color:T.body }}>
        {text}
      </span>
    </div>
  );
}

function WBar({ name, pct, color }: { name:string; pct:number; color:string }) {
  return (
    <div style={{ ...row(8), padding:"4.5px 0" }}>
      <span style={{ fontFamily:MX, width:44, fontSize:11, flexShrink:0,
        color:T.sub, fontWeight:600 }}>{name}</span>
      <div style={{ flex:1, height:5, borderRadius:99,
        background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${pct}%`, borderRadius:99,
          background:`linear-gradient(90deg, ${color}, ${color}55)`,
          boxShadow:`0 0 7px ${color}66`,
          transition:"width 0.8s ease",
        }} />
      </div>
      <span style={{ fontFamily:MX, width:36, textAlign:"right", fontSize:11,
        fontWeight:700, flexShrink:0, color }}>{Math.round(pct)}%</span>
    </div>
  );
}

export function WeightDist({ items, biasDisplay, biasColor }: Props) {
  const bars = WEIGHT_MAP.map((m, i) => {
    const item   = items[i];
    const rawPct = item
      ? (Math.max(item.buyContrib, item.sellContrib) / item.maxPossible) * 100
      : 0;
    const pct = rawPct > 0
      ? Math.min(rawPct * 0.55 + m.base * 0.45, 99)
      : m.base;
    return { ...m, pct };
  });

  return (
    <div style={{ padding:"16px 20px" }}>
      <SLabel text="Weight Distribution" />

      {bars.map((b) => (
        <WBar key={b.name} name={b.name} pct={b.pct} color={b.color} />
      ))}

      <div style={{
        marginTop:14, display:"flex", justifyContent:"center",
        padding:"7px 10px", borderRadius:99,
        background:`${biasColor}14`,
        border:`1px solid ${biasColor}35`,
      }}>
        <span style={{ fontFamily:MX, fontSize:9.5, color:biasColor,
          letterSpacing:"0.15em", fontWeight:700 }}>
          CONFLUENCE → {biasDisplay}
        </span>
      </div>
    </div>
  );
}
