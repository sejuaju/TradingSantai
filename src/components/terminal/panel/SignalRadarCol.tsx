"use client";

import { C, D } from "../shared";
import type { Signal } from "../types";

const row = (gap=0): React.CSSProperties => ({ display:"flex", alignItems:"center", gap });
const col = (gap=0): React.CSSProperties => ({ display:"flex", flexDirection:"column", gap });
const MX  = "monospace";

const T = {
  dim  : "rgba(255,255,255,0.45)",
  sub  : "rgba(255,255,255,0.62)",
  body : "rgba(255,255,255,0.82)",
  main : "rgba(255,255,255,0.96)",
};

interface Props {
  signals     : Signal[];
  formatPrice : (p: number) => string;
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

function RadarRow({ s, highlight }: { s: Signal; highlight: boolean }) {
  const typeColor = s.type === "BUY" ? C.green : C.red;
  const firstTag  = s.reason.split("•")[0].trim();
  const rest      = s.reason.split("•").slice(1).join("·").trim().slice(0, 28);

  return (
    <div style={{
      ...row(10), padding:"5.5px 0",
      opacity: s.status !== "active" ? 0.55 : 1,
      background: highlight ? "rgba(0,212,232,0.06)" : undefined,
      borderRadius: highlight ? 4 : 0,
      paddingLeft: highlight ? 6 : 0,
    }}>
      <span style={{ color:typeColor, fontSize:14, flexShrink:0, width:16 }}>
        {s.type === "BUY" ? "▲" : "▼"}
      </span>
      <div style={{ ...col(2), flex:1, overflow:"hidden" }}>
        <span style={{ fontFamily:MX, fontSize:11,
          color: highlight ? C.cyan : T.body,
          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
          {firstTag}
        </span>
        {rest && (
          <span style={{ fontFamily:MX, fontSize:8.5, color:T.sub }}>{rest}</span>
        )}
      </div>
      <span style={{ fontFamily:MX, fontSize:9, flexShrink:0,
        color: highlight ? C.pink : T.dim }}>
        {new Date(s.time).toLocaleString("en-US", {
          month:"2-digit", day:"2-digit",
          hour:"2-digit", minute:"2-digit", hour12:false,
        })}
      </span>
    </div>
  );
}

export function SignalRadarCol({ signals, formatPrice }: Props) {
  const last = signals.find((s) => s.status === "active");

  return (
    <div style={{ padding:"16px 20px", borderRight:D }}>
      <SLabel text="Signal Radar" />

      {signals.length === 0 ? (
        <div style={{ ...row(8), opacity:0.6, marginTop:8 }}>
          <div style={{ width:7, height:7, borderRadius:"50%",
            background:C.cyan, flexShrink:0 }} />
          <span style={{ fontFamily:MX, fontSize:11, color:T.sub }}>
            Scanning entry signals…
          </span>
        </div>
      ) : (
        signals.slice(0, 6).map((s, i) => (
          <RadarRow key={i} s={s} highlight={i === 0 && s.status === "active"} />
        ))
      )}

      {/* Active position card */}
      {last && (
        <div style={{
          marginTop:12, padding:"10px 12px", borderRadius:6,
          background:"rgba(0,212,232,0.07)",
          border:"1px solid rgba(0,212,232,0.22)",
          ...col(5),
        }}>
          <span style={{ fontFamily:MX, fontSize:8.5, color:C.cyan,
            letterSpacing:"0.12em", fontWeight:700 }}>
            ACTIVE POSITION
          </span>
          <div style={{ ...row(16), flexWrap:"wrap" }}>
            {[
              { label:"ENTRY", val:formatPrice(last.price), color:T.main   },
              { label:"SL",    val:formatPrice(last.sl),    color:C.red    },
              { label:"TP",    val:formatPrice(last.tp),    color:C.green  },
              { label:"RSI",   val:last.rsi.toFixed(0),     color:C.purple },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ ...col(3) }}>
                <span style={{ fontFamily:MX, fontSize:8, color:T.dim }}>{label}</span>
                <span style={{ fontFamily:MX, fontSize:11, fontWeight:700, color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
