"use client";

import { C } from "../shared";
import type { Signal } from "../types";

const col = (gap=0): React.CSSProperties => ({ display:"flex", flexDirection:"column", gap });
const MX  = "monospace";

const T = {
  dim  : "rgba(255,255,255,0.45)",
  sub  : "rgba(255,255,255,0.62)",
  body : "rgba(255,255,255,0.82)",
};

interface Props {
  signals   : Signal[];
  buyScore  : number;
  sellScore : number;
  maxScore  : number;
}

function SLabel({ text }: { text: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
      <span style={{ color:C.purple, fontSize:11 }}>●</span>
      <span style={{ fontFamily:MX, fontSize:9, fontWeight:700, letterSpacing:"0.22em",
        textTransform:"uppercase", color:T.body }}>
        {text}
      </span>
    </div>
  );
}

function StatBox({ label, value, color }: { label:string; value:string; color:string }) {
  return (
    <div style={{ ...col(5), alignItems:"center", justifyContent:"center",
      padding:"10px 6px", borderRadius:6,
      background:"rgba(255,255,255,0.04)",
      border:"1px solid rgba(255,255,255,0.09)" }}>
      <span style={{ fontFamily:MX, fontSize:8.5, textTransform:"uppercase",
        letterSpacing:"0.1em", color:T.sub }}>
        {label}
      </span>
      <span style={{ fontFamily:MX, fontSize:24, fontWeight:700, lineHeight:1, color }}>
        {value}
      </span>
    </div>
  );
}

export function Performance({ signals, buyScore, sellScore, maxScore }: Props) {
  const winCount    = signals.filter((s) => s.status === "win").length;
  const lossCount   = signals.filter((s) => s.status === "loss").length;
  const totalClosed = winCount + lossCount;
  const activeCount = signals.filter((s) => s.status === "active").length;
  const winRate     = totalClosed > 0
    ? Math.round((winCount / totalClosed) * 100) : 0;
  const winRateStr  = totalClosed > 0 ? `${winRate}%` : "0%";
  const oalPct      = sellScore > 0
    ? `${Math.round((sellScore / maxScore) * 100)}%` : "0%";

  const winColor = winRate >= 60 ? C.green : winRate > 0 ? C.amber : C.green;

  const rows: { label:string; value:string; color:string }[][] = [
    [
      { label:"POTEN",    value:signals.length.toString(), color:C.purple },
      { label:"BLV C/S",  value:winCount.toString(),       color:C.cyan   },
      { label:"BEL C/S",  value:lossCount.toString(),      color:C.orange },
      { label:"WIN RATE", value:winRateStr,                color:winColor },
    ],
    [
      { label:"IMGS",   value:activeCount.toString(),    color:C.cyan  },
      { label:"COURSE", value:totalClosed.toString(),    color:C.amber },
      { label:"IN",     value:buyScore.toFixed(1),       color:C.blue  },
      { label:"OAL",    value:oalPct,                    color:C.red   },
    ],
  ];

  return (
    <div style={{ padding:"16px 20px" }}>
      <div style={{ display:"flex", alignItems:"center",
        justifyContent:"space-between", marginBottom:10 }}>
        <SLabel text="Signal Performance" />
        <span style={{ fontFamily:MX, fontSize:8.5, letterSpacing:"0.1em",
          color:T.sub, marginTop:-10 }}>
          LIVE · BINANCE
        </span>
      </div>

      {rows.map((row, ri) => (
        <div key={ri} style={{
          display:"grid", gridTemplateColumns:"repeat(4,1fr)",
          gap:8, marginBottom: ri === 0 ? 8 : 0,
        }}>
          {row.map((s) => <StatBox key={s.label} {...s}/>)}
        </div>
      ))}
    </div>
  );
}
