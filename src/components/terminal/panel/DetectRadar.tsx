"use client";

import { C, D, DETECT_MAP } from "../shared";
import type { ScoreItem } from "../indicators";
import { MAX_SCORE } from "../indicators";

const row = (gap=0): React.CSSProperties => ({ display:"flex", alignItems:"center", gap });
const col = (gap=0): React.CSSProperties => ({ display:"flex", flexDirection:"column", gap });
const MX  = "monospace";

const T = {
  dim  : "rgba(255,255,255,0.45)",
  sub  : "rgba(255,255,255,0.62)",
  body : "rgba(255,255,255,0.82)",
};

interface Props {
  items     : ScoreItem[];
  buyScore  : number;
  sellScore : number;
}

function SLabel({ text }: { text: string }) {
  return (
    <div style={{ ...row(6), marginBottom:12 }}>
      <span style={{ color:C.cyan, fontSize:11 }}>●</span>
      <span style={{ fontFamily:MX, fontSize:9, fontWeight:700, letterSpacing:"0.22em",
        textTransform:"uppercase", color:T.body }}>
        {text}
      </span>
    </div>
  );
}

function Bar({ short, long, color, pct }: {
  short: string; long: string; color: string; pct: number;
}) {
  return (
    <div style={{ ...row(8), padding:"4.5px 0" }}>
      <span style={{ fontFamily:MX, width:40, fontSize:12, fontWeight:700,
        flexShrink:0, color }}>{short}</span>
      <span style={{ fontFamily:MX, width:80, fontSize:9.5, flexShrink:0,
        color:T.sub, overflow:"hidden", whiteSpace:"nowrap" }}>{long}</span>
      <div style={{ flex:1, height:5, borderRadius:99,
        background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${pct}%`, borderRadius:99,
          background:`linear-gradient(90deg, ${color}, ${color}55)`,
          boxShadow:`0 0 7px ${color}77`,
          transition:"width 0.8s ease",
        }} />
      </div>
    </div>
  );
}

export function DetectRadar({ items, buyScore, sellScore }: Props) {
  const bars = DETECT_MAP.map((m, i) => {
    const item   = items[i];
    const rawPct = item
      ? (Math.max(item.buyContrib, item.sellContrib) / item.maxPossible) * 100
      : 0;
    const pct = rawPct > 0
      ? Math.min(rawPct * 0.6 + m.base * 0.4, 99)
      : m.base * 0.35;
    return { ...m, pct };
  });

  return (
    <div style={{ padding:"16px 20px", borderRight:D }}>
      <SLabel text="Detection & Radar" />

      {bars.map((b) => (
        <Bar key={b.short} short={b.short} long={b.long} color={b.color} pct={b.pct} />
      ))}

      {/* Buy / Sell score summary */}
      <div style={{ ...row(12), marginTop:14, paddingTop:12,
        borderTop:"1px solid rgba(255,255,255,0.08)" }}>
        {[
          { label:"BUY SCORE",  val:buyScore,  color:C.green },
          { label:"SELL SCORE", val:sellScore, color:C.red   },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ ...col(4), flex:1 }}>
            <span style={{ fontFamily:MX, fontSize:8.5, color:T.sub,
              letterSpacing:"0.1em" }}>{label}</span>
            <div style={{ height:4, borderRadius:99,
              background:"rgba(255,255,255,0.07)", overflow:"hidden", margin:"3px 0" }}>
              <div style={{ height:"100%", width:`${(val/MAX_SCORE)*100}%`,
                background:color, borderRadius:99 }} />
            </div>
            <span style={{ fontFamily:MX, fontSize:13, fontWeight:700, color }}>
              {val.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
