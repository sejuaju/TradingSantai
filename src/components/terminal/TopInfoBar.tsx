"use client";

import type { ScoreBreakdown } from "./indicators";
import { MAX_SCORE, getScoreColor, getScoreTier } from "./config";
import type { Signal } from "./types";

const MX  = "monospace";
const dim  = "rgba(255,255,255,0.40)";
const D    = "1px solid rgba(255,255,255,0.08)";

interface Props {
  scoreBreakdown : ScoreBreakdown;
  signals        : Signal[];
  connected      : boolean;
}

// ─── Semicircle Gauge ─────────────────────────────────────────────────────────
// FIX: gunakan <tspan> untuk angka+% agar selalu bersatu
// FIX: ID gradient & filter unik per nilai pct agar tidak conflict
function SemiGauge({ pct, color }: { pct: number; color: string }) {
  const W  = 130;
  const H  = 88;         // lebih tinggi → lebih banyak ruang teks di dalam arc
  const cx = W / 2;      // 65
  const cy = H - 8;      // 80 → baseline arc
  const r  = 54;         // radius sedikit lebih besar
  const sw = 7;

  const rad = (deg: number) => (deg * Math.PI) / 180;
  const pt  = (deg: number) => ({
    x: cx + r * Math.cos(rad(deg)),
    y: cy - r * Math.sin(rad(deg)),
  });

  const bgL    = pt(180);
  const bgR    = pt(0);
  const bgPath = `M ${bgL.x.toFixed(2)} ${bgL.y.toFixed(2)} A ${r} ${r} 0 0 1 ${bgR.x.toFixed(2)} ${bgR.y.toFixed(2)}`;

  // Hitung fillDeg berdasarkan pct (dari 180° ke 0°)
  const fillDeg = 180 - (180 * pct / 100);
  const fillEnd = pt(fillDeg);

  // largeArc SELALU 0:
  // Arc dari 180° ke fillDeg hanya merentang 180×pct/100 derajat (max 180°).
  // largeArc=1 akan menggambar arc 360°-span yang memutar BALIK ke bawah → keluar track!
  const largeArc = 0;
  const fillPath = pct > 1
    ? `M ${bgL.x.toFixed(2)} ${bgL.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x.toFixed(2)} ${fillEnd.y.toFixed(2)}`
    : "";

  const ticks = [0, 25, 50, 75, 100].map(t => {
    const deg = 180 - 180 * t / 100;
    return {
      outer: { x: cx + (r + 4) * Math.cos(rad(deg)), y: cy - (r + 4) * Math.sin(rad(deg)) },
      inner: { x: cx + (r - 3) * Math.cos(rad(deg)), y: cy - (r - 3) * Math.sin(rad(deg)) },
    };
  });

  const needle = pt(fillDeg);

  // ID unik — hindari conflict jika ada lebih dari 1 SVG di halaman
  const gradId = `sg_grad_${pct}`;
  const glowId = `sg_glow_${pct}`;

  // Zona aman untuk teks:
  // Puncak arc  = cy - r = 80 - 54 = 26
  // Teks angka di y = cy - 24 = 56 → jauh dari arc track (r ± 3.5)
  // Label SCORE di y = cy - 7  = 73 → tepat di atas baseline arc
  const textY  = cy - 24;
  const labelY = cy - 7;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      style={{ flexShrink:0, overflow:"visible" }}>
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse"
          x1={bgL.x} y1={cy} x2={bgR.x} y2={cy}>
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="1"    />
        </linearGradient>
        {/* filter dengan boundary lebih lebar supaya glow tidak terpotong */}
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Inner glow soft area */}
      <path d={bgPath} fill="none" stroke={color}
        strokeWidth={sw + 14} strokeOpacity="0.04" strokeLinecap="round"/>

      {/* Background track */}
      <path d={bgPath} fill="none"
        stroke="rgba(255,255,255,0.09)" strokeWidth={sw} strokeLinecap="round"/>

      {/* Filled arc */}
      {pct > 1 && (
        <path d={fillPath} fill="none"
          stroke={`url(#${gradId})`} strokeWidth={sw} strokeLinecap="round"
          filter={`url(#${glowId})`}/>
      )}

      {/* Tick marks */}
      {ticks.map((t, i) => (
        <line key={i}
          x1={t.outer.x.toFixed(1)} y1={t.outer.y.toFixed(1)}
          x2={t.inner.x.toFixed(1)} y2={t.inner.y.toFixed(1)}
          stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round"/>
      ))}

      {/* Needle dot */}
      {pct > 1 && (
        <circle
          cx={needle.x.toFixed(2)} cy={needle.y.toFixed(2)}
          r={4.5} fill={color} filter={`url(#${glowId})`}/>
      )}

      {/*
        FIX UTAMA: Gunakan satu <text> + dua <tspan>
        ─ tspan pertama  : angka besar, x=cx y=textY (centered)
        ─ tspan kedua    : "%" kecil, dy="-9" → superscript RELATIF ke angka
        Tidak ada lagi fixed x offset yang bikin "%" melayang
      */}
      <text textAnchor="middle" fontFamily={MX}
        style={{ filter:`drop-shadow(0 0 10px ${color}88)` }}>
        <tspan x={cx} y={textY}
          fill={color} fontSize="26" fontWeight="800">
          {pct}
        </tspan>
        <tspan
          fill={color} fontSize="12" fontWeight="700"
          dy="-9" opacity="0.9">
          %
        </tspan>
      </text>

      {/* Label "SCORE" */}
      <text x={cx} y={labelY}
        textAnchor="middle"
        fill={dim} fontSize="8" fontWeight="600"
        fontFamily={MX} letterSpacing="2">
        SCORE
      </text>
    </svg>
  );
}

// ─── Mini progress bar ────────────────────────────────────────────────────────
function MiniBar({ label, pct, color }: { label:string; pct:number; color:string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column" as const, gap:3 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontFamily:MX, fontSize:9, color, fontWeight:700,
          letterSpacing:"0.1em" }}>{label}</span>
        <span style={{ fontFamily:MX, fontSize:9, color, fontWeight:800 }}>{pct}%</span>
      </div>
      <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, borderRadius:99,
          background:`linear-gradient(90deg,${color}88,${color})`,
          boxShadow:`0 0 6px ${color}55` }}/>
      </div>
    </div>
  );
}

// ─── Composite Score Card ─────────────────────────────────────────────────────
function ScoreCard({ buyScore, sellScore }: { buyScore:number; sellScore:number }) {
  const pct     = Math.round(Math.max(buyScore, sellScore) / MAX_SCORE * 100);
  const color   = getScoreColor(pct);
  const buyPct  = Math.round((buyScore  / MAX_SCORE) * 100);
  const sellPct = Math.round((sellScore / MAX_SCORE) * 100);

  return (
    <div style={{
      position:"relative", overflow:"hidden",
      display:"flex", alignItems:"center", gap:14,
      padding:"10px 18px", borderRadius:12, minWidth:265,
      background:`linear-gradient(135deg,${color}14 0%,#04050c 65%)`,
      border:`1px solid ${color}30`,
      boxShadow:`0 0 28px ${color}12`,
    }}>
      <div style={{ position:"absolute", top:0, left:"8%", right:"8%", height:1.5,
        background:`linear-gradient(90deg,transparent,${color}cc,transparent)` }}/>

      <SemiGauge pct={pct} color={color} />

      <div style={{ display:"flex", flexDirection:"column" as const, gap:8, flex:1, minWidth:0 }}>
        <span style={{ fontFamily:MX, fontSize:9, fontWeight:700,
          letterSpacing:"0.20em", textTransform:"uppercase" as const, color:dim }}>
          Composite Score
        </span>
        <MiniBar label="BUY"  pct={buyPct}  color="#22c55e" />
        <MiniBar label="SELL" pct={sellPct} color="#ef4444" />
      </div>
    </div>
  );
}

// ─── Signal Strength Card ─────────────────────────────────────────────────────
function StrengthCard({ pct }: { pct:number }) {
  const { tier, label, stars, color } = getScoreTier(pct);
  return (
    <div style={{
      position:"relative", overflow:"hidden", flex:1,
      display:"flex", flexDirection:"column" as const,
      alignItems:"center", justifyContent:"center",
      padding:"12px 16px", borderRadius:12, gap:7,
      background:`linear-gradient(160deg,${color}10 0%,transparent 70%)`,
      border:`1px solid ${color}28`,
    }}>
      <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1.5,
        background:`linear-gradient(90deg,transparent,${color}99,transparent)` }}/>
      <span style={{ fontFamily:MX, fontSize:9, fontWeight:700,
        letterSpacing:"0.18em", textTransform:"uppercase" as const, color:dim }}>
        Signal Strength
      </span>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontFamily:MX, fontSize:11, fontWeight:800,
          padding:"2px 8px", borderRadius:5,
          background:`${color}22`, color, border:`1px solid ${color}44`,
          letterSpacing:"0.08em" }}>{tier}</span>
        <span style={{ fontFamily:MX, fontSize:15, fontWeight:800, color,
          textShadow:`0 0 12px ${color}66` }}>{label}</span>
      </div>
      <div style={{ display:"flex", gap:5 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            width:8, height:8, borderRadius:"50%",
            background: i <= stars ? color : "rgba(255,255,255,0.10)",
            boxShadow:  i <= stars ? `0 0 6px ${color}` : "none",
          }}/>
        ))}
      </div>
    </div>
  );
}

// ─── Market Bias Card ─────────────────────────────────────────────────────────
function BiasCard({ bias, buyScore, sellScore }: {
  bias:"BUY"|"SELL"|"NEUTRAL"; buyScore:number; sellScore:number;
}) {
  const color = bias==="BUY" ? "#22c55e" : bias==="SELL" ? "#ef4444" : "#a855f7";
  const arrow = bias==="BUY" ? "↑" : bias==="SELL" ? "↓" : "→";
  const total = buyScore + sellScore;
  const buyW  = total > 0 ? Math.round((buyScore  / total) * 100) : 50;
  const sellW = 100 - buyW;

  return (
    <div style={{
      position:"relative", overflow:"hidden", flex:1,
      display:"flex", flexDirection:"column" as const,
      alignItems:"center", justifyContent:"center",
      padding:"12px 16px", borderRadius:12, gap:7,
      background:`linear-gradient(160deg,${color}10 0%,transparent 70%)`,
      border:`1px solid ${color}28`,
    }}>
      <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1.5,
        background:`linear-gradient(90deg,transparent,${color}99,transparent)` }}/>
      <span style={{ fontFamily:MX, fontSize:9, fontWeight:700,
        letterSpacing:"0.18em", textTransform:"uppercase" as const, color:dim }}>
        Market Bias
      </span>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:22, color, lineHeight:1,
          textShadow:`0 0 14px ${color}88`, fontWeight:800 }}>{arrow}</span>
        <span style={{ fontFamily:MX, fontSize:16, fontWeight:800, color,
          textShadow:`0 0 14px ${color}66` }}>{bias}</span>
      </div>
      <div style={{ width:"100%", display:"flex", flexDirection:"column" as const, gap:4 }}>
        <div style={{ height:5, borderRadius:99, overflow:"hidden",
          background:"rgba(255,255,255,0.07)", display:"flex" }}>
          <div style={{ width:`${buyW}%`, background:"linear-gradient(90deg,#16a34a,#22c55e)" }}/>
          <div style={{ width:`${sellW}%`, background:"linear-gradient(90deg,#dc2626,#ef4444)" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontFamily:MX, fontSize:9, color:"#22c55e", fontWeight:700 }}>B {buyW}%</span>
          <span style={{ fontFamily:MX, fontSize:9, color:"#ef4444", fontWeight:700 }}>S {sellW}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Signal Activity Card ─────────────────────────────────────────────────────
function ActivityCard({ signals }: { signals:Signal[] }) {
  const active = signals.filter(s => s.status==="active").length;
  const win    = signals.filter(s => s.status==="win").length;
  const loss   = signals.filter(s => s.status==="loss").length;
  const total  = signals.length;
  const closed = win + loss;
  const wr     = closed > 0 ? Math.round((win / closed) * 100) : 0;
  const color  = "#00d4e8";

  return (
    <div style={{
      position:"relative", overflow:"hidden", flex:1,
      display:"flex", flexDirection:"column" as const,
      alignItems:"center", justifyContent:"center",
      padding:"12px 16px", borderRadius:12, gap:7,
      background:`linear-gradient(160deg,${color}10 0%,transparent 70%)`,
      border:`1px solid ${color}28`,
    }}>
      <div style={{ position:"absolute", top:0, left:"15%", right:"15%", height:1.5,
        background:`linear-gradient(90deg,transparent,${color}99,transparent)` }}/>
      <span style={{ fontFamily:MX, fontSize:9, fontWeight:700,
        letterSpacing:"0.18em", textTransform:"uppercase" as const, color:dim }}>
        Signal Activity
      </span>
      <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
        {active > 0 && (
          <div style={{ width:7, height:7, borderRadius:"50%", background:color,
            boxShadow:`0 0 8px ${color}`, flexShrink:0,
            animation:"pulse 2s infinite" }}/>
        )}
        <span style={{ fontFamily:MX, fontSize:26, fontWeight:800, color,
          textShadow:`0 0 16px ${color}66`, lineHeight:1 }}>{active}</span>
        <span style={{ fontFamily:MX, fontSize:12, color:dim, fontWeight:600 }}>/ {total}</span>
      </div>
      <div style={{ width:"100%", display:"flex", flexDirection:"column" as const, gap:4 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:MX, fontSize:9, color:dim, letterSpacing:"0.1em" }}>WIN RATE</span>
          <span style={{ fontFamily:MX, fontSize:9, fontWeight:800,
            color: wr >= 50 ? "#22c55e" : "#f97316" }}>{wr}%</span>
        </div>
        <div style={{ height:4, borderRadius:99, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${wr}%`, borderRadius:99,
            background: wr >= 50
              ? "linear-gradient(90deg,#16a34a,#22c55e)"
              : "linear-gradient(90deg,#ea580c,#f97316)" }}/>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function TopInfoBar({ scoreBreakdown, signals }: Props) {
  const { buyScore, sellScore, bias } = scoreBreakdown;
  const pct = Math.round(Math.max(buyScore, sellScore) / MAX_SCORE * 100);

  return (
    <div style={{ background:"#04050c", borderBottom:D, flexShrink:0 }}>
      <div style={{ display:"flex", gap:8, padding:"10px 14px", alignItems:"stretch" }}>
        <ScoreCard buyScore={buyScore} sellScore={sellScore} />
        <StrengthCard pct={pct} />
        <BiasCard bias={bias} buyScore={buyScore} sellScore={sellScore} />
        <ActivityCard signals={signals} />
      </div>
    </div>
  );
}
