"use client";

import { useMemo } from "react";
import type { Signal } from "./types";
import type { Candle } from "./types";
import type { ScoreBreakdown } from "./indicators";
import { MAX_SCORE } from "./indicators";
import { C, T, D } from "./shared";

// ─── Local constants ──────────────────────────────────────────────────────────
const MX  = "monospace";
const COL = "1px solid rgba(255,255,255,0.08)";
const PAD = "16px 20px";

const DETECT_MAP = [
  { short:"OVB",   long:"On Balance",    color:"#00e5cc" },
  { short:"OIT",   long:"Overall Trend", color:"#ec4899" },
  { short:"GIT",   long:"Oscillator",    color:"#f97316" },
  { short:"CVG",   long:"CNN Analyst",   color:"#00d4e8" },
  { short:"GWAP",  long:"Wizard Core",   color:"#a855f7" },
  { short:"BLYCK", long:"Neural Trade",  color:"#f59e0b" },
  { short:"ARB",   long:"Automation",    color:"#22c55e" },
] as const;

const WEIGHT_MAP = [
  { name:"VGA",   color:"#00e5cc" }, { name:"GPI",   color:"#ec4899" },
  { name:"CIL",   color:"#f97316" }, { name:"CVS",   color:"#a855f7" },
  { name:"YWWF",  color:"#f59e0b" }, { name:"BLOCK", color:"#f97316" },
  { name:"ARS",   color:"#00d4e8" },
] as const;

interface Props {
  signals: Signal[]; scoreBreakdown: ScoreBreakdown;
  candles: Candle[]; currentPrice: number;
  formatPrice: (p:number)=>string;
  selectedTf: string; htfTrend: "bullish"|"bearish"|"neutral";
}

const row = (g=0):React.CSSProperties=>({display:"flex",alignItems:"center",gap:g});
const col = (g=0):React.CSSProperties=>({display:"flex",flexDirection:"column",gap:g});

// ─── Section Header ───────────────────────────────────────────────────────────
function Head({ dot, title, sub, action }: {
  dot:string; title:string; sub?:string; action?:React.ReactNode;
}) {
  return (
    <div style={{...row(7), marginBottom:14, justifyContent:"space-between"}}>
      <div style={row(7)}>
        <span style={{ fontSize:9, color:dot }}>●</span>
        <div style={col(2)}>
          <span style={{ fontFamily:MX, fontSize:10, fontWeight:800,
            letterSpacing:"0.16em", textTransform:"uppercase" as const,
            color:T.body }}>{title}</span>
          {sub && <span style={{ fontFamily:MX, fontSize:8.5, fontWeight:600,
            letterSpacing:"0.12em", textTransform:"uppercase" as const,
            color:T.sub }}>{sub}</span>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Detection bar ────────────────────────────────────────────────────────────
function DetectBar({ short, long, pct, color }: {
  short:string; long:string; pct:number; color:string;
}) {
  return (
    <div style={{...row(8), padding:"4px 0"}}>
      <div style={{...row(6), width:46, flexShrink:0}}>
        <div style={{ width:6, height:6, borderRadius:"50%",
          background:color, boxShadow:`0 0 5px ${color}`, flexShrink:0 }}/>
        <span style={{ fontFamily:MX, fontSize:10, fontWeight:800,
          color, flexShrink:0 }}>{short}</span>
      </div>
      <span style={{ width:74, fontSize:9, fontFamily:MX, flexShrink:0,
        color:T.dim, overflow:"hidden",
        whiteSpace:"nowrap" as const }}>{long}</span>
      <div style={{ flex:1, height:5, borderRadius:99,
        background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, borderRadius:99,
          background:`linear-gradient(90deg,${color},${color}55)`,
          boxShadow:`0 0 6px ${color}55` }}/>
      </div>
      <span style={{ width:30, textAlign:"right" as const, fontFamily:MX,
        fontSize:9, fontWeight:700, color:T.sub, flexShrink:0 }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ─── Weight bar ───────────────────────────────────────────────────────────────
function WeightBar({ name, pct, color }: { name:string; pct:number; color:string }) {
  return (
    <div style={{...row(8), padding:"4px 0"}}>
      <span style={{ width:40, fontFamily:MX, fontSize:9.5, fontWeight:700,
        flexShrink:0, color:T.sub }}>{name}</span>
      <div style={{ flex:1, height:5, borderRadius:99,
        background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, borderRadius:99,
          background:`linear-gradient(90deg,${color},${color}55)`,
          boxShadow:`0 0 6px ${color}55` }}/>
      </div>
      <span style={{ width:36, textAlign:"right" as const, fontFamily:MX,
        fontSize:10, fontWeight:800, color, flexShrink:0 }}>{Math.round(pct)}%</span>
    </div>
  );
}

// ─── Ring Gauge ───────────────────────────────────────────────────────────────
function RingGauge({ value, bias }: { value:number; bias:"BUY"|"SELL"|"NEUTRAL" }) {
  const cx=55, cy=55, rx=42, sw=6;
  const circ=2*Math.PI*rx, fill=(Math.min(value,100)/100)*circ;
  const color = bias==="BUY"?C.green : bias==="SELL"?C.red : C.purple;
  const label = bias==="BUY"?"BULLISH": bias==="SELL"?"BEARISH":"NEUTRAL";
  const ticks = [0,0.25,0.5,0.75].map(t=>{
    const a=t*2*Math.PI-Math.PI/2;
    return { x1:cx+(rx-4)*Math.cos(a), y1:cy+(rx-4)*Math.sin(a),
             x2:cx+(rx+4)*Math.cos(a), y2:cy+(rx+4)*Math.sin(a) };
  });
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" style={{flexShrink:0}}>
      <circle cx={cx} cy={cy} r={rx} fill="none" stroke={color}
        strokeWidth={sw+12} opacity="0.07"/>
      <circle cx={cx} cy={cy} r={rx} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={sw}/>
      {ticks.map((t,i)=>(
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke="rgba(255,255,255,0.25)" strokeWidth="1.5"/>
      ))}
      <circle cx={cx} cy={cy} r={rx} fill="none" stroke={color}
        strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${fill} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{transition:"stroke-dasharray 0.7s ease"}}/>
      <text x={cx} y={cy-4} textAnchor="middle" fill="white"
        fontSize="26" fontWeight="bold" fontFamily={MX}>{value}</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize="9.5"
        fontFamily={MX} fontWeight="bold" fill={color}>{label}</text>
      <text x={cx} y={cy+24} textAnchor="middle" fontSize="8"
        fontFamily={MX} fill="rgba(255,255,255,0.55)">SIGNAL</text>
    </svg>
  );
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────
function MiniBar({ value, label, color }: { value:number; label:string; color:string }) {
  const maxH=48, barH=Math.max(4,(Math.min(value,100)/100)*maxH);
  return (
    <div style={{...col(4), alignItems:"center", minWidth:46}}>
      <span style={{ fontFamily:MX, fontSize:14, fontWeight:800, color,
        textShadow:`0 0 12px ${color}55` }}>{value}</span>
      <div style={{ display:"flex", alignItems:"flex-end",
        justifyContent:"center", height:`${maxH}px` }}>
        <div style={{ width:13, height:`${barH}px`, borderRadius:3,
          background:`linear-gradient(to top,${color},${color}44)`,
          boxShadow:`0 0 8px ${color}44` }}/>
      </div>
      <span style={{ fontFamily:MX, fontSize:9, textTransform:"uppercase" as const,
        textAlign:"center" as const, letterSpacing:"0.08em",
        color:T.dim, lineHeight:1.3 }}>{label}</span>
    </div>
  );
}

// ─── Stat cell ────────────────────────────────────────────────────────────────
function StatCell({ label, value, color, glow }: {
  label:string; value:string; color:string; glow?:boolean;
}) {
  return (
    <div style={{ position:"relative", overflow:"hidden",
      display:"flex", flexDirection:"column" as const,
      alignItems:"center", justifyContent:"center",
      padding:"12px 8px", borderRadius:8, gap:6,
      background: glow ? `${color}12` : "rgba(255,255,255,0.03)",
      border:`1px solid ${glow ? `${color}40` : "rgba(255,255,255,0.08)"}` }}>
      {glow && <div style={{ position:"absolute", top:0, left:"20%", right:"20%",
        height:1.5,
        background:`linear-gradient(90deg,transparent,${color}88,transparent)` }}/>}
      <span style={{ fontFamily:MX, fontSize:9, fontWeight:700,
        letterSpacing:"0.16em", textTransform:"uppercase" as const,
        color:T.dim }}>{label}</span>
      <span style={{ fontFamily:MX, fontSize:24, fontWeight:800,
        lineHeight:1, color, textShadow:`0 0 16px ${color}44` }}>{value}</span>
    </div>
  );
}

// ─── Liquidity row ────────────────────────────────────────────────────────────
function LiqRow({ label, value, valueColor, time }: {
  label:string; value?:string; valueColor?:string; time:string;
}) {
  return (
    <div style={{...row(0), justifyContent:"space-between",
      padding:"7px 10px", marginBottom:6, borderRadius:6,
      background:"rgba(255,255,255,0.04)",
      border:"1px solid rgba(255,255,255,0.08)"}}>
      <span style={{ fontFamily:MX, fontSize:10, color:T.body }}>{label}</span>
      <div style={row(10)}>
        {value && <span style={{ fontFamily:MX, fontSize:10, fontWeight:800,
          color:valueColor??C.cyan, padding:"1px 7px", borderRadius:3,
          background:`${valueColor??C.cyan}18` }}>{value}</span>}
        <span style={{ fontFamily:MX, fontSize:9, color:T.dim }}>{time}</span>
      </div>
    </div>
  );
}

// ─── Trend cell ───────────────────────────────────────────────────────────────
function TrendCell({ isBull }: { isBull:boolean }) {
  const accent = isBull ? C.cyan : C.red;
  return (
    <div style={{ display:"flex", flexDirection:"column" as const,
      alignItems:"center", justifyContent:"center",
      padding:"8px 4px", borderRadius:6, gap:4,
      border:`1px solid ${accent}40`,
      background:`linear-gradient(160deg,${accent}10,transparent)` }}>
      <svg width="18" height="13" viewBox="0 0 18 13">
        {isBull
          ? <polyline points="1,12 9,2 17,12" fill="none" stroke={accent}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          : <polyline points="1,2 9,12 17,2" fill="none" stroke={accent}
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        }
      </svg>
      <span style={{ fontFamily:MX, fontSize:9, fontWeight:800,
        color:accent, letterSpacing:"0.1em" }}>CRAT</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function AnalyticsBoard({
  signals, scoreBreakdown, candles,
  currentPrice, formatPrice, selectedTf, htfTrend,
}: Props) {
  const { buyScore, sellScore, items, bias } = scoreBreakdown;

  const win    = signals.filter(s=>s.status==="win").length;
  const loss   = signals.filter(s=>s.status==="loss").length;
  const closed = win+loss;
  const wr     = closed>0 ? Math.round((win/closed)*100) : 0;
  const active = signals.filter(s=>s.status==="active").length;
  const gauge  = Math.round(Math.max(buyScore,sellScore)/MAX_SCORE*100);

  const bars = [
    { v:Math.max(1,Math.round(buyScore/2)),             l:"YIELD",    c:C.cyan   },
    { v:Math.max(1,Math.round(sellScore/2)),            l:"MOMENTUM", c:C.purple },
    { v:Math.max(1,Math.round((buyScore+sellScore)/4)), l:"VALUE",    c:C.green  },
    { v:Math.max(1,Math.round(buyScore/8)),             l:"RATE",     c:C.orange },
  ];

  const smcData = useMemo(()=>{
    if(candles.length<20) return null;
    const rc=candles.slice(-20);
    const hi=Math.max(...rc.map(c=>c.high));
    const lo=Math.min(...rc.map(c=>c.low));
    const rng=hi-lo;
    const vol=rc.reduce((s,c)=>s+c.volume,0);
    const pocPct=rng>0?Math.min(99,Math.max(1,((currentPrice-lo)/rng)*100)):50;
    return { pocPct, liqVal:(rng*0.032).toFixed(2), vol:Math.round(vol) };
  },[candles,currentPrice]);

  const isBull  = bias==="BUY";
  const htfBull = htfTrend==="bullish";
  const strong  = Math.max(buyScore,sellScore)>15;
  const TF_COLS = [selectedTf,"1D","1W"];
  const matrix  = [
    [isBull&&strong, isBull],
    [isBull, isBull||htfBull],
    [htfBull, htfTrend!=="bearish"],
  ];
  const now = new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",hour12:false});

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
      borderTop:D, background:"#060810" }}>

      {/* ═══ LEFT COLUMN ══════════════════════════════════════════════════════ */}
      <div style={{ borderRight:COL, ...col(0) }}>

        {/* L1: Detection & Radar + Signal Radar */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
          borderBottom:COL, padding:PAD, gap:20 }}>

          {/* Detection & Radar */}
          <div style={{ borderRight:"1px solid rgba(255,255,255,0.06)", paddingRight:20 }}>
            <Head dot={C.cyan} title="Detection & Radar" />
            {items.slice(0,7).map((item,i)=>{
              const m=DETECT_MAP[i%DETECT_MAP.length];
              const top=Math.max(item.buyContrib,item.sellContrib);
              const pct=item.maxPossible>0?(top/item.maxPossible)*100:0;
              return <DetectBar key={item.name} short={m.short} long={m.long}
                pct={Math.max(pct,4)} color={m.color}/>;
            })}
          </div>

          {/* Signal Radar */}
          <div>
            <Head dot={C.cyan} title="Signal Radar" />
            {signals.length===0 ? (
              <div style={{...row(10), padding:"10px 0"}}>
                <div style={{ width:7, height:7, borderRadius:"50%",
                  background:C.cyan, boxShadow:`0 0 6px ${C.cyan}`,
                  animation:"pulse 2s infinite", flexShrink:0 }}/>
                <span style={{ fontFamily:MX, fontSize:10, color:T.dim }}>
                  Scanning signals…
                </span>
              </div>
            ) : signals.slice(0,6).map((s,i)=>{
              const isAct = s.status==="active";
              const tc    = s.type==="BUY" ? C.green : C.red;
              const dt    = new Date(s.time).toLocaleDateString("en-US",{month:"2-digit",day:"2-digit"});
              const statusColor =
                s.status==="win"  ? C.green :
                s.status==="loss" ? C.red   : C.amber;
              const statusLabel =
                s.status==="win"  ? "WIN"  :
                s.status==="loss" ? "LOSS" : "LIVE";
              return (
                <div key={i} style={{
                  padding:"6px 8px", marginBottom:5, borderRadius:6,
                  background: isAct ? `${tc}0c` : "rgba(255,255,255,0.02)",
                  border:`1px solid ${isAct ? `${tc}30` : "rgba(255,255,255,0.07)"}`,
                  opacity: isAct ? 1 : 0.55,
                }}>
                  {/* Row 1: type badge + reason + date */}
                  <div style={{...row(7), marginBottom:4}}>
                    <span style={{
                      fontFamily:MX, fontSize:9, fontWeight:800,
                      padding:"1px 6px", borderRadius:3,
                      background:`${tc}22`, color:tc,
                      border:`1px solid ${tc}44`,
                      flexShrink:0,
                    }}>{s.type}</span>
                    <span style={{ flex:1, fontFamily:MX, fontSize:9.5,
                      color:isAct?T.body:T.dim,
                      overflow:"hidden", whiteSpace:"nowrap" as const,
                      textOverflow:"ellipsis" }}>{s.reason}</span>
                    <span style={{ fontFamily:MX, fontSize:9, color:T.dim,
                      flexShrink:0 }}>{dt}</span>
                  </div>
                  {/* Row 2: status badge */}
                  <div style={{ fontFamily:MX, fontSize:9, fontWeight:800,
                    color:statusColor, letterSpacing:"0.1em" }}>
                    ● {statusLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* L2: SMC & Volume Profile */}
        <div style={{ borderBottom:COL, padding:PAD }}>
          <Head dot={C.orange} title="3MC & Volume Profile" sub="Liquidity & Structure" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>

            <div>
              {smcData ? (
                <>
                  <LiqRow label="Fair Values Gap (4H/H)" time={now}/>
                  <LiqRow label="Liquidity Gaming"
                    value={`+${smcData.liqVal}`} valueColor={C.red} time={now}/>
                  <LiqRow label="MDX | Chantith" time={now}/>
                </>
              ) : <span style={{fontFamily:MX,fontSize:10,color:T.mute}}>Loading…</span>}
            </div>

            <div>
              <span style={{ fontFamily:MX, fontSize:9.5, fontWeight:800,
                letterSpacing:"0.14em", textTransform:"uppercase" as const,
                color:C.cyan, display:"block", marginBottom:12 }}>
                Volume Profile (POE)
              </span>
              {smcData && (<>
                <div style={{...row(0), justifyContent:"space-between", marginBottom:8}}>
                  <span style={{fontFamily:MX,fontSize:10,color:T.sub}}>PHC Curles</span>
                  <span style={{fontFamily:MX,fontSize:11,fontWeight:800,color:T.main}}>
                    {formatPrice(currentPrice)}
                  </span>
                </div>
                <div style={{ position:"relative", height:5, borderRadius:99,
                  background:"rgba(255,255,255,0.09)", marginBottom:12 }}>
                  <div style={{ position:"absolute", left:0, top:0, bottom:0,
                    width:`${smcData.pocPct}%`, borderRadius:99,
                    background:`linear-gradient(90deg,${C.cyan},${C.purple})` }}/>
                  <div style={{ position:"absolute", top:"50%",
                    left:`${smcData.pocPct}%`, transform:"translate(-50%,-50%)",
                    width:11, height:11, borderRadius:"50%",
                    background:C.red, boxShadow:`0 0 7px ${C.red}` }}/>
                </div>
                <div style={{...row(0), justifyContent:"space-between"}}>
                  <span style={{fontFamily:MX,fontSize:10,color:T.sub}}>Orema</span>
                  <span style={{fontFamily:MX,fontSize:10,fontWeight:700,color:T.dim}}>
                    {smcData.vol}/10AL
                  </span>
                </div>
              </>)}
            </div>
          </div>
        </div>

        {/* L3: Trend Matrix */}
        <div style={{ padding:PAD, flex:1 }}>
          <div style={{...row(10), marginBottom:14}}>
            <span style={{color:C.cyan,fontSize:10}}>●</span>
            <span style={{ fontFamily:MX, fontSize:10, fontWeight:800,
              letterSpacing:"0.16em", textTransform:"uppercase" as const,
              color:T.body }}>Trend Matrix</span>
            <span style={{ fontFamily:MX, fontSize:9, fontWeight:600,
              letterSpacing:"0.12em", textTransform:"uppercase" as const,
              color:T.sub }}>Higher</span>
          </div>

          {/* Col headers */}
          <div style={{ display:"grid", gridTemplateColumns:"64px repeat(3,1fr)",
            gap:6, marginBottom:8 }}>
            <div/>
            {TF_COLS.map((tf, ci)=>(
              <div key={ci} style={{ textAlign:"center" as const,
                fontFamily:MX, fontSize:9.5, fontWeight:700,
                color:T.sub, letterSpacing:"0.1em" }}>{tf}</div>
            ))}
          </div>

          {/* Rows */}
          {["FEMA","FEINS"].map((lbl,ri)=>(
            <div key={lbl} style={{ display:"grid",
              gridTemplateColumns:"64px repeat(3,1fr)", gap:6, marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"center",
                fontFamily:MX, fontSize:10, fontWeight:700,
                color:T.sub, letterSpacing:"0.06em" }}>{lbl}</div>
              {matrix.map((mc,ci)=>(
                <TrendCell key={ci} isBull={mc[ri]}/>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RIGHT COLUMN ═════════════════════════════════════════════════════ */}
      <div style={col(0)}>

        {/* R1: Weight Distribution */}
        <div style={{ padding:PAD, borderBottom:COL }}>
          <Head dot={C.orange} title="Weight Distribution" />
          {items.slice(0,7).map((item,i)=>{
            const m=WEIGHT_MAP[i%WEIGHT_MAP.length];
            const top=Math.max(item.buyContrib,item.sellContrib);
            const pct=item.maxPossible>0?(top/item.maxPossible)*100:0;
            return <WeightBar key={item.name} name={m.name} pct={Math.max(pct,5)} color={m.color}/>;
          })}
        </div>

        {/* R2: Signal Engine */}
        <div style={{ padding:PAD, borderBottom:COL }}>
          <Head dot={C.purple} title="Signal Engine" />
          <div style={{...row(20), alignItems:"center"}}>
            <RingGauge value={gauge} bias={bias}/>
            <div style={{ display:"flex", alignItems:"flex-end",
              gap:18, flex:1, justifyContent:"center" }}>
              {bars.map(b=><MiniBar key={b.l} value={b.v} label={b.l} color={b.c}/>)}
            </div>
          </div>
        </div>

        {/* R3: Signal Performance */}
        <div style={{ padding:PAD, flex:1 }}>
          <Head dot={C.purple} title="Signal Performance"
            action={<span style={{ fontSize:14, color:T.dim, cursor:"pointer" }}>↻</span>}/>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
            gap:8, marginBottom:8 }}>
            <StatCell label="TOTAL"    value={signals.length.toString()} color={C.purple} glow/>
            <StatCell label="WIN"      value={win.toString()}            color={C.cyan}/>
            <StatCell label="LOSS"     value={loss.toString()}           color={C.orange}/>
            <StatCell label="WIN RATE" value={closed>0?`${wr}%`:"0.0%"} color={C.green}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
            <StatCell label="ACTIVE" value={active.toString()}           color={C.cyan}/>
            <StatCell label="CLOSED" value={closed.toString()}           color={C.amber}/>
            <StatCell label="ACT"    value={active.toFixed(2)}           color={C.blue}/>
            <StatCell label="RATE"   value={wr>0?`${wr}%`:"0%"}         color={C.green}/>
          </div>
        </div>
      </div>
    </div>
  );
}
