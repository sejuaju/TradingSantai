"use client";

import type { Signal } from "./types";
import type { ScoreBreakdown } from "./indicators";
import { MAX_SCORE } from "./indicators";
import { C, D, DETECT_MAP, WEIGHT_MAP } from "./shared";

const MX = "monospace";

interface Props {
  signals        : Signal[];
  scoreBreakdown : ScoreBreakdown;
  formatPrice    : (p: number) => string;
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ title, dotColor }: { title: string; dotColor: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
      <span style={{ color:dotColor, fontSize:11, animation:"pulse 2s infinite" }}>●</span>
      <span style={{ color:"rgba(255,255,255,0.38)", fontSize:9, fontWeight:700,
        letterSpacing:"0.18em", textTransform:"uppercase" as const, fontFamily:MX }}>
        {title}
      </span>
    </div>
  );
}

// ─── Detection bar row ────────────────────────────────────────────────────────
function DetectBar({ short, long, pct, color }: {
  short:string; long:string; pct:number; color:string;
}) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0" }}>
      <span style={{ width:38, fontSize:11, fontWeight:700, fontFamily:MX, flexShrink:0, color }}>{short}</span>
      <span style={{ width:72, fontSize:9, fontFamily:MX, flexShrink:0,
        color:"rgba(255,255,255,0.25)", overflow:"hidden", whiteSpace:"nowrap" as const }}>{long}</span>
      <div style={{ flex:1, height:6, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, borderRadius:99,
          background:`linear-gradient(90deg,${color},${color}66)`, boxShadow:`0 0 8px ${color}88` }}/>
      </div>
    </div>
  );
}

// ─── Weight bar row ───────────────────────────────────────────────────────────
function WeightBar({ name, pct, color }: { name:string; pct:number; color:string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0" }}>
      <span style={{ width:38, fontSize:10, fontFamily:MX, flexShrink:0,
        color:"rgba(255,255,255,0.35)" }}>{name}</span>
      <div style={{ flex:1, height:6, borderRadius:99, background:"rgba(255,255,255,0.06)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, borderRadius:99,
          background:`linear-gradient(90deg,${color},${color}66)`, boxShadow:`0 0 7px ${color}66` }}/>
      </div>
      <span style={{ width:30, textAlign:"right" as const, fontSize:10,
        fontWeight:700, fontFamily:MX, flexShrink:0, color }}>{Math.round(pct)}%</span>
    </div>
  );
}

// ─── Ring Gauge ───────────────────────────────────────────────────────────────
export function SignalRingGauge({ value, bias }: { value:number; bias:"BUY"|"SELL"|"NEUTRAL" }) {
  const cx=60, cy=60, r=46, stroke=7;
  const circ = 2*Math.PI*r;
  const fill = (Math.min(value,100)/100)*circ;
  const color = bias==="BUY" ? C.green : bias==="SELL" ? C.red : C.purple;
  const label = bias==="BUY" ? "BULLISH" : bias==="SELL" ? "BEARISH" : "NEUTRAL";
  const ticks = [0,0.25,0.5,0.75].map(t=>{
    const a=t*2*Math.PI-Math.PI/2;
    return { x1:cx+(r-5)*Math.cos(a), y1:cy+(r-5)*Math.sin(a),
             x2:cx+(r+5)*Math.cos(a), y2:cy+(r+5)*Math.sin(a) };
  });
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke+10} opacity="0.06"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke}/>
      {ticks.map((t,i)=>(
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      ))}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition:"stroke-dasharray 0.7s ease, stroke 0.4s ease" }}/>
      <text x={cx} y={cy-4} textAnchor="middle" fill="white"
        fontSize="28" fontWeight="bold" fontFamily={MX}>{value}</text>
      <text x={cx} y={cy+16} textAnchor="middle" fontSize="10"
        fontFamily={MX} fontWeight="bold" fill={color}>{label}</text>
    </svg>
  );
}

// ─── Mini vertical bar ────────────────────────────────────────────────────────
export function MiniBar({ value, label, color }: { value:number; label:string; color:string }) {
  const maxH=64, barH=Math.max(5,(Math.min(value,100)/100)*maxH);
  return (
    <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:3 }}>
      <span style={{ fontSize:13, fontWeight:700, fontFamily:MX, color }}>{value}</span>
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", height:`${maxH}px` }}>
        <div style={{ width:14, height:`${barH}px`, borderRadius:3,
          background:`linear-gradient(to top,${color},${color}66)`,
          boxShadow:`0 0 8px ${color}66` }}/>
      </div>
      <span style={{ fontSize:8, fontFamily:MX, textTransform:"uppercase" as const,
        textAlign:"center" as const, color:"rgba(255,255,255,0.25)", lineHeight:1.2 }}>{label}</span>
    </div>
  );
}

// ─── Stat cell ────────────────────────────────────────────────────────────────
export function StatCell({ label, value, color, glow }: {
  label:string; value:string; color:string; glow?:boolean;
}) {
  return (
    <div style={{ display:"flex", flexDirection:"column" as const,
      alignItems:"center", justifyContent:"center",
      padding:"10px 6px", borderRadius:6, gap:4,
      background: glow ? `${color}18` : "rgba(255,255,255,0.02)",
      border:`1px solid ${glow ? `${color}35` : "rgba(255,255,255,0.06)"}` }}>
      <span style={{ fontSize:8, textTransform:"uppercase" as const,
        letterSpacing:"0.1em", fontFamily:MX, color:"rgba(255,255,255,0.3)" }}>{label}</span>
      <span style={{ fontSize:22, fontWeight:700, fontFamily:MX, lineHeight:1, color }}>{value}</span>
    </div>
  );
}

// ─── Signal radar row ─────────────────────────────────────────────────────────
function RadarRow({ s }: { s: Signal }) {
  const isActive  = s.status === "active";
  const typeColor = s.type === "BUY" ? C.green : C.red;
  const dateStr   = new Date(s.time).toLocaleDateString("en-US",{month:"2-digit",day:"2-digit"});
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"5px 0",
      opacity: isActive ? 1 : 0.5 }}>
      <span style={{ color:typeColor, fontSize:12, fontWeight:700, flexShrink:0, width:18 }}>
        {s.type==="BUY" ? "▲" : "▼"}
      </span>
      <span style={{ flex:1, fontSize:10, fontFamily:MX,
        color: isActive ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)",
        overflow:"hidden", whiteSpace:"nowrap" as const, textOverflow:"ellipsis" }}>
        {s.reason}
      </span>
      <span style={{ fontSize:9, fontFamily:MX, flexShrink:0,
        color: isActive ? C.pink : "rgba(255,255,255,0.2)" }}>{dateStr}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROW 1 — Detection & Radar | Signal Radar | Weight Distribution  (3-col)
// ══════════════════════════════════════════════════════════════════════════════
export function SignalPanelTopRow({ signals, scoreBreakdown }: Props) {
  const { items } = scoreBreakdown;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
      borderTop:D, borderBottom:D, background:"#070a14" }}>

      {/* Detection & Radar */}
      <div style={{ padding:"16px 20px", borderRight:D }}>
        <SectionHeader title="Detection & Radar" dotColor={C.cyan} />
        {items.slice(0,7).map((item, i) => {
          const map  = DETECT_MAP[i % DETECT_MAP.length];
          const topV = Math.max(item.buyContrib, item.sellContrib);
          const pct  = item.maxPossible > 0 ? (topV/item.maxPossible)*100 : 0;
          return <DetectBar key={item.name} short={map.short} long={map.long}
            pct={Math.max(pct,4)} color={map.color} />;
        })}
      </div>

      {/* Signal Radar */}
      <div style={{ padding:"16px 20px", borderRight:D }}>
        <SectionHeader title="Signal Radar" dotColor={C.cyan} />
        {signals.length === 0 ? (
          <div style={{ display:"flex", alignItems:"center", gap:8, opacity:0.4, padding:"8px 0" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.cyan }}/>
            <span style={{ color:"rgba(255,255,255,0.3)", fontSize:10, fontFamily:MX }}>
              Scanning entry signals…
            </span>
          </div>
        ) : (
          signals.slice(0,6).map((s,i) => <RadarRow key={i} s={s}/>)
        )}
      </div>

      {/* Weight Distribution */}
      <div style={{ padding:"16px 20px" }}>
        <SectionHeader title="Weight Distribution" dotColor={C.orange} />
        {items.slice(0,7).map((item, i) => {
          const map  = WEIGHT_MAP[i % WEIGHT_MAP.length];
          const topV = Math.max(item.buyContrib, item.sellContrib);
          const pct  = item.maxPossible > 0 ? (topV/item.maxPossible)*100 : 0;
          return <WeightBar key={item.name} name={map.name} pct={Math.max(pct,8)} color={map.color} />;
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROW 2 — Signal Engine (kiri) | Signal Performance (kanan)  (2-col)
// ══════════════════════════════════════════════════════════════════════════════
export function SignalPanelBottomRow({ signals, scoreBreakdown }: Props) {
  const { buyScore, sellScore, bias } = scoreBreakdown;

  const winCount    = signals.filter(s=>s.status==="win").length;
  const lossCount   = signals.filter(s=>s.status==="loss").length;
  const totalClosed = winCount+lossCount;
  const winRate     = totalClosed>0 ? Math.round((winCount/totalClosed)*100) : 0;
  const activeCount = signals.filter(s=>s.status==="active").length;
  const gaugeVal    = Math.round(Math.max(buyScore,sellScore)/MAX_SCORE*100);

  const barsData = [
    { value:Math.max(1,Math.round(buyScore/2)),               label:"YIELD",    color:C.cyan   },
    { value:Math.max(1,Math.round(sellScore/2)),              label:"MOMENTUM", color:C.purple },
    { value:Math.max(1,Math.round((buyScore+sellScore)/4)),   label:"VALUE",    color:C.green  },
    { value:Math.max(1,Math.round(buyScore/8)),               label:"SCORE",    color:C.orange },
  ];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
      borderBottom:D, background:"#070a14" }}>

      {/* Signal Engine */}
      <div style={{ padding:"16px 20px", borderRight:D }}>
        <SectionHeader title="Signal Engine" dotColor={C.purple} />
        <div style={{ display:"flex", alignItems:"center", gap:24 }}>
          <SignalRingGauge value={gaugeVal} bias={bias} />
          <div style={{ display:"flex", alignItems:"flex-end", gap:20, paddingBottom:4 }}>
            {barsData.map(b=><MiniBar key={b.label} value={b.value} label={b.label} color={b.color}/>)}
          </div>
        </div>
      </div>

      {/* Signal Performance */}
      <div style={{ padding:"16px 20px" }}>
        <SectionHeader title="Signal Performance" dotColor={C.purple} />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:8 }}>
          <StatCell label="TOTAL"    value={signals.length.toString()}               color={C.purple} glow/>
          <StatCell label="WIN"      value={winCount.toString()}                     color={C.cyan}/>
          <StatCell label="LOSS"     value={lossCount.toString()}                    color={C.orange}/>
          <StatCell label="WIN RATE" value={totalClosed>0 ? `${winRate}%` : "0.0%"} color={C.green}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
          <StatCell label="ACTIVE" value={activeCount.toString()}                    color={C.cyan}/>
          <StatCell label="CLOSED" value={totalClosed.toString()}                    color={C.amber}/>
          <StatCell label="ACT"    value={activeCount.toFixed(2)}                    color={C.blue}/>
          <StatCell label="RATE"   value={winRate>0 ? `${winRate}%` : "0%"}          color={C.green}/>
        </div>
      </div>
    </div>
  );
}

// backward-compat default export (sudah tidak dipakai di TradingTerminal)
export function SignalPanel(props: Props) {
  return (
    <>
      <SignalPanelTopRow    {...props} />
      <SignalPanelBottomRow {...props} />
    </>
  );
}
