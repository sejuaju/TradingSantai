"use client";

import { C, D } from "../shared";

// ─── Text tokens ──────────────────────────────────────────────────────────────
const T = {
  dim  : "rgba(255,255,255,0.45)",
  sub  : "rgba(255,255,255,0.62)",
  body : "rgba(255,255,255,0.82)",
  main : "rgba(255,255,255,0.96)",
};

interface Props {
  gaugeVal    : number;
  tierLabel   : string;
  tierColor   : string;
  biasDisplay : string;
  biasColor   : string;
  activeCount : number;
  total       : number;
}

function MetBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"10px 16px", minHeight:68,
      fontFamily:"monospace" }}>
      <span style={{ fontSize:8, letterSpacing:"0.18em", textTransform:"uppercase",
        color:T.dim, marginBottom:4 }}>
        {label}
      </span>
      {children}
    </div>
  );
}

export function BrandingBar({
  gaugeVal, tierLabel, tierColor,
  biasDisplay, biasColor, activeCount, total,
}: Props) {
  return (
    <div style={{ display:"flex", borderBottom:D,
      background:"rgba(0,0,0,0.35)", flexShrink:0 }}>

      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:10,
        padding:"8px 20px", flexShrink:0, borderRight:D, fontFamily:"monospace" }}>
        <span style={{ color:C.cyan, fontSize:11 }}>●</span>
        <span style={{ fontSize:12, fontWeight:800, letterSpacing:"0.18em", color:C.cyan }}>
          TRADINGSANTAI
        </span>
        <span style={{ fontSize:12, fontWeight:800, letterSpacing:"0.12em", color:T.body }}>
          ULTIMATE
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:5,
          background:"rgba(0,212,232,0.14)", border:"1px solid rgba(0,212,232,0.30)",
          borderRadius:4, padding:"2px 8px" }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:C.green,
            flexShrink:0, display:"inline-block" }} />
          <span style={{ fontFamily:"monospace", fontSize:9, color:C.cyan,
            letterSpacing:"0.1em", fontWeight:700 }}>LIVE</span>
        </div>
      </div>

      {/* 4 metric boxes */}
      <div style={{ display:"flex", flex:1 }}>

        <div style={{ flex:1, borderRight:D }}>
          <MetBox label="Composite Score">
            <span style={{ fontSize:30, fontWeight:800, color:T.main, lineHeight:1 }}>
              {gaugeVal}%
            </span>
          </MetBox>
        </div>

        <div style={{ flex:1.8, borderRight:D }}>
          <MetBox label="Wibble Think">
            <span style={{ fontSize:20, fontWeight:800, color:tierColor,
              letterSpacing:"0.04em", lineHeight:1 }}>
              {tierLabel}
            </span>
          </MetBox>
        </div>

        <div style={{ flex:1, borderRight:D }}>
          <MetBox label="Direction Has">
            <span style={{ fontSize:26, fontWeight:800, color:biasColor, lineHeight:1 }}>
              {biasDisplay}
            </span>
          </MetBox>
        </div>

        <div style={{ flex:0.8 }}>
          <MetBox label="Active Signals">
            <span style={{ fontSize:30, fontWeight:800, color:T.main, lineHeight:1 }}>
              {activeCount}/{total}
            </span>
            <span style={{ fontFamily:"monospace", fontSize:8, color:T.dim, marginTop:3 }}>
              live / total
            </span>
          </MetBox>
        </div>

      </div>
    </div>
  );
}
