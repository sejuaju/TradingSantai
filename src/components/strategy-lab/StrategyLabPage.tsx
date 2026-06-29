"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  STRATEGY_CATALOG,
  DEFAULT_STRATEGY_SOURCE,
  TS_SMC_UNLOCKED_SOURCE,
  isStrategyUnlocked,
  unlockStrategyDemo,
  runBacktestFromSource,
  runBacktestBuiltin,
  generateDemoCandles,
  smcDemoCandles,
  SMC_DEMO_BAR_COUNT,
  parseStrategySource,
  validateUploadFile,
  exportToMql5,
  downloadMql5File,
  downloadReferenceMq5,
  REFERENCE_MQ5_URL,
  REFERENCE_MQ5_FILENAME,
  type BacktestResult,
  type CatalogStrategy,
} from "@/lib/strategy-lab";
import type { Candle } from "@/components/terminal/types";
import StrategyLabHeader      from "./StrategyLabHeader";
import StrategyCatalogSidebar from "./StrategyCatalogSidebar";
import StrategyEditorPanel    from "./StrategyEditorPanel";
import BacktestTerminal       from "./BacktestTerminal";

export default function StrategyLabPage() {
  const [selectedId,     setSelectedId]     = useState("rsi-ma-starter");
  const [source,         setSource]         = useState(DEFAULT_STRATEGY_SOURCE);
  const [unlocked,       setUnlocked]       = useState(false);
  const [result,         setResult]         = useState<BacktestResult | null>(null);
  const [backtestCandles,setBacktestCandles]= useState<Candle[]>([]);
  const [running,        setRunning]        = useState(false);
  const [parseErrors,    setParseErrors]    = useState<string[]>([]);
  const [parseWarnings,  setParseWarnings]  = useState<string[]>([]);
  const [uploadMsg,      setUploadMsg]      = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => STRATEGY_CATALOG.find((s) => s.id === selectedId) ?? STRATEGY_CATALOG[0],
    [selectedId],
  );

  const isPremiumLocked = selected.tier === "premium" && !unlocked;
  const isSmcStrategy   = selected.id === "ts-smc-pro";

  // Hitung active step untuk header
  const activeStep = result ? 4 : running ? 3 : source.trim() ? 2 : 1;

  useEffect(() => {
    setUnlocked(isStrategyUnlocked("ts-smc-pro"));
  }, []);

  const loadStrategy = useCallback((strategy: CatalogStrategy) => {
    setSelectedId(strategy.id);
    setResult(null);
    setBacktestCandles([]);
    setUploadMsg("");

    if (strategy.id === "ts-smc-pro") {
      const isUnlocked = isStrategyUnlocked("ts-smc-pro");
      setUnlocked(isUnlocked);
      setSource(isUnlocked ? TS_SMC_UNLOCKED_SOURCE : strategy.source);
    } else {
      setSource(strategy.source);
    }

    const src =
      strategy.id === "ts-smc-pro" && isStrategyUnlocked("ts-smc-pro")
        ? TS_SMC_UNLOCKED_SOURCE
        : strategy.tier === "premium" && !isStrategyUnlocked("ts-smc-pro")
          ? ""
          : strategy.source;
    const parsed = parseStrategySource(src);
    setParseErrors(parsed.errors);
    setParseWarnings(parsed.warnings);
  }, []);

  const handleSourceChange = (value: string) => {
    if (isPremiumLocked) return;
    setSource(value);
    const parsed = parseStrategySource(value);
    setParseErrors(parsed.errors);
    setParseWarnings(parsed.warnings);
    setResult(null);
    setBacktestCandles([]);
  };

  const handleRunBacktest = () => {
    setRunning(true);
    setUploadMsg("");
    setResult(null);
    setBacktestCandles([]);

    const candles = isSmcStrategy
      ? smcDemoCandles(SMC_DEMO_BAR_COUNT)
      : generateDemoCandles(200);

    requestAnimationFrame(() => {
      const bt =
        isSmcStrategy && selected.builtinRunner === "ts-smc-trial"
          ? runBacktestBuiltin(candles, "ts-smc-trial")
          : runBacktestFromSource(candles, source);
      setBacktestCandles(candles);
      setResult(bt);
      setRunning(false);
    });
  };

  const handleUpload = async (file: File) => {
    const err = validateUploadFile(file.name, file.size);
    if (err) { setUploadMsg(err); return; }

    const text = await file.text();
    setSource(text);
    setSelectedId("custom");
    setResult(null);
    setBacktestCandles([]);

    const parsed = parseStrategySource(text);
    setParseErrors(parsed.errors);
    setParseWarnings(parsed.warnings);
    setUploadMsg(
      parsed.ok
        ? `File "${file.name}" berhasil dimuat.`
        : "File dimuat — perbaiki error sebelum backtest.",
    );
  };

  const handleUnlock = () => {
    unlockStrategyDemo("ts-smc-pro");
    setUnlocked(true);
    setSource(TS_SMC_UNLOCKED_SOURCE);
    const parsed = parseStrategySource(TS_SMC_UNLOCKED_SOURCE);
    setParseErrors(parsed.errors);
    setParseWarnings(parsed.warnings);
    setUploadMsg("Unlock aktif — source & export .mq5 tersedia.");
  };

  const handleExport = async () => {
    if (isPremiumLocked) { setUploadMsg("Unlock strategi premium untuk export .mq5."); return; }
    if (isSmcStrategy) {
      const err = await downloadReferenceMq5(REFERENCE_MQ5_URL, REFERENCE_MQ5_FILENAME);
      setUploadMsg(err ?? "TS_SMC_EA v1.50 diunduh — buka di MetaEditor.");
      return;
    }
    const exported = exportToMql5(source, {
      strategyName: selected.name,
      licensedTo: unlocked ? "Trading Santai Member" : undefined,
    });
    if (!exported.ok || !exported.content) {
      setUploadMsg(exported.error ?? "Export gagal.");
      return;
    }
    const slug = selected.id.replace(/[^a-z0-9-]/gi, "_");
    downloadMql5File(exported.content, `${slug}.mq5`);
    setUploadMsg("File .mq5 berhasil diunduh.");
  };

  return (
    <div className="h-screen bg-[#07080f] text-white flex flex-col overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".mq5"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleUpload(f);
          e.target.value = "";
        }}
      />

      {/* Fixed header */}
      <StrategyLabHeader
        running={running}
        strategyName={selected.name}
        isSmcStrategy={isSmcStrategy}
        onRunBacktest={handleRunBacktest}
        runDisabled={!isPremiumLocked && parseErrors.length > 0}
        activeStep={activeStep}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col pt-[3.5rem] min-h-0 overflow-hidden">
        <div className="flex-1 flex min-h-0 max-w-[1800px] w-full mx-auto px-3 sm:px-5 py-3 gap-3 overflow-hidden">

          {/* ── Catalog sidebar ── */}
          <aside className="hidden md:flex w-[240px] lg:w-[260px] xl:w-[280px] shrink-0 flex-col min-h-0 rounded-2xl border border-white/[0.07] overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.7)]">
            <StrategyCatalogSidebar
              strategies={STRATEGY_CATALOG}
              selectedId={selectedId}
              unlocked={unlocked}
              onSelect={loadStrategy}
            />
          </aside>

          {/* ── Workbench (editor + terminal) ── */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-3 overflow-hidden">

            {/* Panel header strip */}
            <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-white/[0.07] bg-[#0b0c14] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35 leading-none mb-1">
                  Workbench
                </p>
                <p className="text-xs text-white/55 font-medium truncate">
                  {selected.name}
                  {isPremiumLocked && (
                    <span className="ml-2 text-[10px] text-amber-400/70">· Trial mode</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${running ? "bg-cyan-400 animate-pulse" : result?.ok ? "bg-green-500" : "bg-white/20"}`} />
                <span className="text-[10px] text-white/35 font-mono">
                  {running ? "Running…" : result?.ok ? `${result.totalTrades} trades · ${result.signals.length} signals` : "Ready"}
                </span>
              </div>
            </div>

            {/* Editor panel */}
            <div className="shrink-0 rounded-2xl border border-white/[0.07] overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]"
              style={{ height: "clamp(180px, 26vh, 260px)" }}>
              <StrategyEditorPanel
                source={source}
                strategyName={selected.name}
                isPremiumLocked={isPremiumLocked}
                isSmcStrategy={isSmcStrategy}
                parseErrors={parseErrors}
                parseWarnings={parseWarnings}
                uploadMsg={uploadMsg}
                onSourceChange={handleSourceChange}
                onUploadClick={() => fileRef.current?.click()}
                onExport={handleExport}
                onUnlock={handleUnlock}
              />
            </div>

            {/* Backtest terminal — mengisi sisa ruang */}
            <div className="flex-1 min-h-0 rounded-2xl border border-white/[0.07] overflow-hidden shadow-[0_8px_40px_-12px_rgba(0,0,0,0.7)]">
              <BacktestTerminal
                candles={backtestCandles}
                result={result}
                running={running}
                strategyName={selected.name}
                isSmcStrategy={isSmcStrategy}
                barCount={isSmcStrategy ? SMC_DEMO_BAR_COUNT : 200}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
