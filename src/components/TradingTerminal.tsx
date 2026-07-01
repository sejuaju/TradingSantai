"use client";

import { useRef, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnalyticsBoard }      from "./terminal/AnalyticsBoard";
import { AgentSidebar }        from "./terminal/AgentSidebar";
import { TopInfoBar }          from "./terminal/TopInfoBar";
import { CandlestickChart }    from "./terminal/CandlestickChart";
import { UserMonitorSidebar }  from "./terminal/UserMonitorSidebar";
import { InstrumentSelector }  from "./terminal/InstrumentSelector";
import { SaxoLoginButton }     from "./terminal/SaxoLoginButton";
import { useMarketData }       from "./terminal/useMarketData";
import { useSignals }          from "./terminal/useSignals";
import { HTF_MAP, TIMEFRAMES } from "./terminal/constants";
import { DEFAULT_INSTRUMENT_ID, type Instrument, INSTRUMENTS } from "./terminal/config";



// ─── Text colours (bright enough for #04050a background) ─────────────────────
const T = {
  mute : "rgba(255,255,255,0.52)",
  dim  : "rgba(255,255,255,0.65)",
  sub  : "rgba(255,255,255,0.78)",
  body : "rgba(255,255,255,0.90)",
  main : "rgba(255,255,255,0.97)",
};

// ─── Fullscreen icons ─────────────────────────────────────────────────────────
function IconExpand() {
  return (
    <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
      <path d="M1 5V1H5"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 1H12V5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 8V12H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 12H1V8"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconCollapse() {
  return (
    <svg width="14" height="14" viewBox="0 0 13 13" fill="none">
      <path d="M5 1V5H1"   stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 5H8V1"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 12V8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 8H5V12"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function LoadingSpinner() {
  return (
    <div style={{
      width: 40,
      height: 40,
      border: "4px solid rgba(255,255,255,0.1)",
      borderTop: "4px solid #00d4e8",
      borderRadius: "50%",
      animation: "spin 1s linear infinite",
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────
function LoadingState({ broker = "BINANCE" }: { broker?: string }) {
  const isNonBinance = broker !== "BINANCE";
  
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      height: "400px",
      background: "#0d0f1a",
    }}>
      {!isNonBinance && <LoadingSpinner />}
      <div style={{ textAlign: "center", maxWidth: 500, padding: "0 20px" }}>
        <div style={{
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: 700,
          color: isNonBinance ? "#f3ba2f" : T.main,
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}>
          {isNonBinance ? "⚠️ BROKER NOT AVAILABLE" : "LOADING MARKET DATA"}
        </div>
        <div style={{
          fontFamily: "monospace",
          fontSize: 11,
          color: T.dim,
          lineHeight: 1.6,
        }}>
          {isNonBinance ? (
            <>
              This instrument requires <strong style={{ color: "#00a9e0" }}>{broker}</strong> authentication.
              <br />
              <br />
              Currently, only <strong style={{ color: "#f3ba2f" }}>Binance</strong> cryptocurrency instruments are available.
              <br />
              <br />
              To use Forex, Stocks, Commodities, or Indices:
              <br />
              Please refer to <code style={{ background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 3 }}>docs/SAXO_MIGRATION.md</code>
            </>
          ) : (
            `Fetching candles from ${broker}...`
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      height: "400px",
      background: "#0d0f1a",
      padding: "0 20px",
    }}>
      <div style={{
        width: 60,
        height: 60,
        borderRadius: "50%",
        background: "rgba(239,68,68,0.12)",
        border: "2px solid rgba(239,68,68,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ fontSize: 30, color: "#f87171" }}>⚠</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: 700,
          color: "#f87171",
          letterSpacing: "0.1em",
          marginBottom: 8,
        }}>
          CONNECTION ERROR
        </div>
        <div style={{
          fontFamily: "monospace",
          fontSize: 11,
          color: T.dim,
          marginBottom: 16,
          maxWidth: 400,
        }}>
          {error}
        </div>
        <button
          onClick={onRetry}
          style={{
            padding: "8px 20px",
            borderRadius: 6,
            border: "1px solid rgba(0,212,232,0.3)",
            background: "rgba(0,212,232,0.12)",
            color: "#00d4e8",
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,212,232,0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0,212,232,0.12)";
          }}
        >
          ⟳ RETRY CONNECTION
        </button>
      </div>
    </div>
  );
}

// ─── Indicator pills ──────────────────────────────────────────────────────────
function Pill({ label, bull, icon }: { label:string; bull:boolean; icon?:string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5,
      padding:"4px 10px", borderRadius:5, fontFamily:"monospace",
      fontSize:10, fontWeight:700,
      background: bull ? "rgba(34,197,94,0.12)"  : "rgba(239,68,68,0.12)",
      border:     bull ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(239,68,68,0.25)",
      color:      bull ? "#4ade80" : "#f87171" }}>
      {icon && <span style={{ fontSize:9 }}>{icon}</span>}
      <span>{label}</span>
    </div>
  );
}

function RsiPill({ rsi }: { rsi:number }) {
  const color = rsi > 70 ? "#f87171" : rsi < 30 ? "#4ade80" : T.body;
  const bg    = rsi > 70 ? "rgba(239,68,68,0.12)" : rsi < 30 ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)";
  const bdr   = rsi > 70 ? "rgba(239,68,68,0.25)" : rsi < 30 ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.10)";
  return (
    <div style={{ padding:"4px 10px", borderRadius:5,
      fontFamily:"monospace", fontSize:10, fontWeight:700,
      background:bg, border:`1px solid ${bdr}`, color }}>
      RSI {rsi.toFixed(0)}
    </div>
  );
}

// ─── Main Terminal ────────────────────────────────────────────────────────────
export default function TradingTerminal() {
  const terminalRef                     = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const searchParams = useSearchParams();

  // ✅ FIX 1: Tambah router untuk update URL saat instrument berubah
  const router = useRouter();

  // Baca instrument dari URL — jadi sumber kebenaran saat refresh
  const initialInstrument = searchParams?.get("instrument");
  const [instrumentId, setInstrumentId] = useState<string>(() => {
    return (initialInstrument && INSTRUMENTS[initialInstrument])
      ? initialInstrument
      : DEFAULT_INSTRUMENT_ID;
  });

  // ✅ FIX 2: HAPUS useEffect yang membersihkan URL
  // Kode lama salah karena menghapus ?instrument= dari URL,
  // sehingga refresh selalu kembali ke default.
  // URL sekarang dipertahankan dan diupdate saat instrument berubah.

  const {
    candles, currentPrice, priceChange,
    high24h, low24h, vol24h,
    selectedTf, htfTrend, connected,
    isLoading, error, priceUp,
    switchTimeframe, instrument,
  } = useMarketData(instrumentId);

  // ✅ FIX 3: Simpan pilihan instrument ke URL saat user ganti instrument
  const handleInstrumentChange = (newInstrument: Instrument) => {
    setInstrumentId(newInstrument.id);
    // Update URL tanpa reload halaman — dipertahankan saat refresh
    router.replace(`/?instrument=${newInstrument.id}`, { scroll: false });
  };
  const {
    signals, rsiValue,
    ema50Value, ema200Value,
    macdValue, macdSignalValue,
    scoreBreakdown,
  } = useSignals(candles, htfTrend);
  const macdBull = macdValue > macdSignalValue;

  const formatPrice = (p:number) =>
    p.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });

  const handleRetry = () => {
    switchTimeframe(selectedTf);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) terminalRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  useEffect(() => {
    const h = (e:KeyboardEvent) => {
      if (e.key === "F11" && terminalRef.current) { e.preventDefault(); toggleFullscreen(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const chartH = isFullscreen ? "clamp(440px, 58vh, 620px)" : "500px";

  const htfColor = htfTrend==="bullish" ? "#22c55e" : htfTrend==="bearish" ? "#ef4444" : T.sub;

  return (
    <div ref={terminalRef} style={{
      background: "#08090f", display:"flex", flexDirection:"column",
      border:       isFullscreen ? "none" : "1px solid rgba(255,255,255,0.10)",
      borderRadius: isFullscreen ? 0 : 16,
      overflow:     "hidden",
      boxShadow:    isFullscreen ? "none" : "0 25px 50px rgba(0,0,0,0.6)",
      height:       isFullscreen ? "100vh" : undefined,
    }}>

      {/* ══ TITLE BAR ══════════════════════════════════════════════════════════ */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"8px 16px", background:"#04050a",
        borderBottom:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>

        {/* Traffic lights + label */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ display:"flex", gap:5 }}>
            {["#dc2626bb","#d97706aa","#16a34aaa"].map((bg,i) => (
              <div key={i} style={{ width:11, height:11, borderRadius:"50%", background:bg }}/>
            ))}
          </div>
          <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:600,
            letterSpacing:"0.18em", color:T.sub }}>
            TRADINGSANTAI GRADE TERMINAL V22.0
          </span>
        </div>

        {/* Status + fullscreen */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <SaxoLoginButton />
          
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.12)" }}/>
          
          <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:T.dim }}>
            {"OWNER"}
          </span>
          <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700,
            color: connected ? "#4ade80" : "#f87171" }}>
            {connected ? "● LIVE" : "● OFFLINE"}
          </span>
          <div style={{ width:1, height:16, background:"rgba(255,255,255,0.12)" }}/>
          <button onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
            style={{ display:"flex", alignItems:"center", gap:6,
              padding:"5px 11px", borderRadius:5, cursor:"pointer",
              border:"1px solid rgba(255,255,255,0.15)",
              background: isFullscreen ? "rgba(0,212,232,0.15)" : "rgba(255,255,255,0.07)",
              color:      isFullscreen ? "#00d4e8" : T.sub,
              fontFamily:"monospace", fontSize:10, fontWeight:700,
              letterSpacing:"0.1em", transition:"all 0.18s ease" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background =
                isFullscreen ? "rgba(0,212,232,0.25)" : "rgba(255,255,255,0.13)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background =
                isFullscreen ? "rgba(0,212,232,0.15)" : "rgba(255,255,255,0.07)";
            }}>
            {isFullscreen ? <IconCollapse/> : <IconExpand/>}
            <span>{isFullscreen ? "EXIT FULL" : "FULLSCREEN"}</span>
          </button>
        </div>
      </div>

      {/* ══ MAIN BODY ══════════════════════════════════════════════════════════ */}
      <div style={{ display:"flex", flex:1, width:"100%", minHeight: 0, overflow: "hidden" }}>

        {(
          <AgentSidebar
            signals={signals}
            isFullscreen={isFullscreen}
          />
        )}

        {/* CENTER */}
        <div className="no-scrollbar" style={{ flex:1, display:"flex",
          flexDirection:"column", minWidth:0, width:"100%", overflowX:"hidden",
          overflowY: isFullscreen ? "auto" : "hidden" }}>

          {/* Top Info Bar */}
          <TopInfoBar scoreBreakdown={scoreBreakdown} signals={signals} connected={connected}/>
          {/* ── Pair info bar ── */}
          <div style={{ borderBottom:"1px solid rgba(255,255,255,0.07)",
            background:"#07080f", flexShrink:0 }}>

            {/* Price row */}
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px 7px" }}>
              {/* Instrument Selector */}
              {instrument && (
                <InstrumentSelector
                  currentInstrument={instrument}
                  onSelect={handleInstrumentChange}
                />
              )}

              <div style={{ width:1, height:18, background:"rgba(255,255,255,0.10)" }}/>

              <span style={{ fontFamily:"monospace", fontSize:18, fontWeight:800,
                color: priceUp ? "#4ade80" : "#f87171",
                textShadow: priceUp ? "0 0 20px rgba(74,222,128,0.35)" : "0 0 20px rgba(248,113,113,0.35)" }}>
                ${currentPrice>0 ? formatPrice(currentPrice) : "—"}
              </span>

              <span style={{ fontFamily:"monospace", fontSize:11, fontWeight:700,
                padding:"3px 9px", borderRadius:5,
                background: priceChange>=0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                border:`1px solid ${priceChange>=0 ? "rgba(34,197,94,0.28)" : "rgba(239,68,68,0.28)"}`,
                color: priceChange>=0 ? "#4ade80" : "#f87171" }}>
                {priceChange>=0?"+":""}{priceChange.toFixed(2)}%
              </span>

              {/* Broker Badge */}
              {instrument && (
                <span style={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: instrument.broker === "BINANCE" 
                    ? "rgba(243,186,47,0.12)" 
                    : "rgba(0,169,224,0.12)",
                  border: instrument.broker === "BINANCE"
                    ? "1px solid rgba(243,186,47,0.25)"
                    : "1px solid rgba(0,169,224,0.25)",
                  color: instrument.broker === "BINANCE" ? "#f3ba2f" : "#00a9e0",
                  letterSpacing: "0.1em",
                }}>
                  {instrument.broker}
                </span>
              )}

              {/* Stats */}
              <div style={{ marginLeft:"auto", display:"flex", gap:18 }}>
                {[
                  { l:"VOL",  v:`${vol24h}`,                    c:T.body    },
                  { l:"HIGH", v:high24h>0?formatPrice(high24h):"—", c:"#4ade80" },
                  { l:"LOW",  v:low24h>0 ?formatPrice(low24h) :"—", c:"#f87171" },
                  { l:"HTF",  v:HTF_MAP[selectedTf],            c:htfColor  },
                ].map(({l,v,c})=>(
                  <div key={l} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                    <span style={{ fontFamily:"monospace", fontSize:9, fontWeight:600,
                      color:T.mute, letterSpacing:"0.12em" }}>{l}</span>
                    <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:c }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeframe + pills */}
            <div style={{ display:"flex", alignItems:"center",
              justifyContent:"space-between", padding:"0 14px 8px" }}>

              <div style={{ display:"flex", gap:2,
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:7, padding:"3px" }}>
                {TIMEFRAMES.map(tf=>(
                  <button key={tf} onClick={()=>switchTimeframe(tf)} style={{
                    padding:"4px 12px", fontSize:10, fontFamily:"monospace",
                    borderRadius:5, border:"none", cursor:"pointer", transition:"all 0.15s",
                    background: selectedTf===tf ? "rgba(0,212,232,0.18)" : "transparent",
                    color:      selectedTf===tf ? "#00d4e8" : T.dim,
                    fontWeight: selectedTf===tf ? 800 : 500,
                    boxShadow:  selectedTf===tf ? "0 0 10px rgba(0,212,232,0.25)" : "none",
                  }}>{tf}</button>
                ))}
              </div>

              <div style={{ display:"flex", gap:6 }}>
                <Pill label="EMA"  bull={ema50Value>ema200Value} icon={ema50Value>ema200Value?"▲":"▼"}/>
                <Pill label={`MACD ${macdBull?"↑":"↓"}`} bull={macdBull}/>
                <RsiPill rsi={rsiValue}/>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div style={{
            height: chartH,
            padding:"6px 8px 10px",
            background:"#0d0f1a",
            borderBottom:"1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
            transition:"height 0.3s ease",
            
          }}>
            {isLoading ? (
              <LoadingState broker={instrument?.broker} />
            ) : error ? (
              <ErrorState error={error} onRetry={handleRetry} />
            ) : (
              <CandlestickChart
                candles={candles}
                signals={signals}
                viewKey={`${instrumentId}-${selectedTf}`}
              />
            )}
          </div>

          {/* Analytics Board */}
          <AnalyticsBoard
            signals={signals} scoreBreakdown={scoreBreakdown} candles={candles}
            currentPrice={currentPrice} formatPrice={formatPrice}
            selectedTf={selectedTf} htfTrend={htfTrend}
          />

          {/* Status bar */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"6px 16px", background:"#03040a",
            borderTop:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
            <div style={{ display:"flex", gap:16, fontFamily:"monospace",
              fontSize:10, letterSpacing:"0.1em", color:T.dim }}>
              <span>{`${instrument?.broker || "BINANCE"} REAL-TIME`}</span>
              <span>TF: {selectedTf} · HTF: {HTF_MAP[selectedTf]}</span>
              <span>EMA · MACD · RSI · VOLUME · PATTERNS</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {isFullscreen && (
                <span style={{ fontFamily:"monospace", fontSize:10,
                  color:"rgba(0,212,232,0.6)", letterSpacing:"0.1em" }}>
                  ⛶ FULLSCREEN · Press F11 to exit
                </span>
              )}
              <span style={{ fontFamily:"monospace", fontSize:10,
                letterSpacing:"0.1em", color:T.dim }}>
                {instrument?.category.toUpperCase() || "CRYPTO"}
              </span>
            </div>
          </div>

        </div>

        <UserMonitorSidebar
          signals={signals}
          currentPrice={currentPrice}
          formatPrice={formatPrice}
          isFullscreen={isFullscreen}
        />

      </div>
    </div>
  );
}
