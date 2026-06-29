"use client";

import { useMemo, useState } from "react";
import {
  Upload, Download, Lock, Unlock, AlertCircle, CheckCircle2,
  XCircle, Code2, Cpu, ChevronDown, ChevronUp, FileCode,
} from "lucide-react";

interface Props {
  source: string;
  strategyName: string;
  isPremiumLocked: boolean;
  isSmcStrategy: boolean;
  parseErrors: string[];
  parseWarnings: string[];
  uploadMsg: string;
  onSourceChange: (v: string) => void;
  onUploadClick: () => void;
  onExport: () => void;
  onUnlock: () => void;
}

export default function StrategyEditorPanel({
  source, strategyName, isPremiumLocked, isSmcStrategy,
  parseErrors, parseWarnings, uploadMsg,
  onSourceChange, onUploadClick, onExport, onUnlock,
}: Props) {
  const [refOpen, setRefOpen] = useState(false);
  const lines = useMemo(() => source.split("\n"), [source]);

  const hasErr  = parseErrors.length > 0;
  const hasWarn = parseWarnings.length > 0;
  const isOk    = !hasErr && !hasWarn && source.trim().length > 0;

  /* status badge */
  const badge = hasErr
    ? { label: `${parseErrors.length} Error`,   cls: "text-red-400 bg-red-500/8 border-red-500/20" }
    : hasWarn
    ? { label: `${parseWarnings.length} Warn`,  cls: "text-amber-400 bg-amber-500/8 border-amber-500/20" }
    : isOk
    ? { label: "Valid",                          cls: "text-green-400 bg-green-500/8 border-green-500/20" }
    : { label: "Ready",                          cls: "text-white/30 bg-transparent border-white/[0.08]" };

  return (
    <section className="flex flex-col h-full min-h-0 overflow-hidden">

      {/* ── Tab / toolbar bar ── */}
      <div className="shrink-0 flex items-center gap-0 border-b border-white/[0.07] bg-[#0c0d16]">

        {/* File tab */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-r border-white/[0.07]
          bg-[#0e0f1a] text-white/75 text-[12px] font-medium min-w-0">
          {isSmcStrategy
            ? <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            : <Code2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          }
          <span className="truncate max-w-[130px]">{strategyName}</span>
          <span className="text-white/20 text-[10px] shrink-0 ml-1 font-mono">.mq5</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Line count */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 text-[10px] text-white/25 font-mono">
          <span>{lines.length}</span>
          <span className="text-white/15">ln</span>
        </div>

        {/* Status badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 mx-2 rounded-lg text-[10px]
          font-semibold border ${badge.cls} transition-all`}>
          {hasErr   && <XCircle      className="w-3 h-3" />}
          {hasWarn  && <AlertCircle  className="w-3 h-3" />}
          {isOk     && <CheckCircle2 className="w-3 h-3" />}
          {badge.label}
        </div>

        <div className="w-px h-5 bg-white/[0.07] mx-1 hidden sm:block" />

        {/* Upload */}
        <button type="button" onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium text-white/45
            hover:text-white/80 hover:bg-white/[0.04] transition-all border-l border-white/[0.06]">
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Upload</span>
        </button>

        {/* Export */}
        <button type="button" onClick={onExport} disabled={isPremiumLocked}
          className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium
            text-indigo-400/70 hover:text-indigo-300 hover:bg-indigo-500/[0.07]
            disabled:opacity-30 disabled:cursor-not-allowed transition-all
            border-l border-white/[0.06]">
          {isPremiumLocked ? <Lock className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">Export MT5</span>
        </button>
      </div>

      {/* ── Editor ── */}
      <div className="relative flex-1 min-h-0">

        {/* Premium lock overlay */}
        {isPremiumLocked && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4
            bg-[#0b0c14]/92 backdrop-blur-sm px-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/8 border border-amber-500/20
              flex items-center justify-center shadow-[0_0_28px_-6px_rgba(245,158,11,0.25)]">
              <Lock className="w-5 h-5 text-amber-400/70" />
            </div>
            <div className="text-center max-w-[240px]">
              <p className="text-[13px] font-semibold text-white/65 mb-1.5">Source Code Terkunci</p>
              <p className="text-[11px] text-white/30 leading-relaxed">
                Trial backtest gratis tersedia. Unlock untuk akses penuh &amp; export{" "}
                <code className="text-amber-400/70 font-mono">.mq5</code>
              </p>
            </div>
            <button type="button" onClick={onUnlock}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold
                bg-amber-500/10 text-amber-300 border border-amber-500/25
                hover:bg-amber-500/18 hover:border-amber-500/40 transition-all
                shadow-[0_0_20px_-6px_rgba(245,158,11,0.22)]">
              <Unlock className="w-4 h-4" />
              Unlock Demo — Gratis
            </button>
          </div>
        )}

        {/* Code area */}
        <div className="flex h-full min-h-0 overflow-auto lab-editor-scroll bg-[#090a13]">
          {/* Line numbers */}
          <div className="shrink-0 select-none text-right py-4 pl-3 pr-2.5
            border-r border-white/[0.04] bg-[#07080f] sticky left-0 z-10" aria-hidden>
            {lines.map((_, i) => (
              <div key={i} className="text-[11px] leading-[1.65rem] font-mono
                text-white/15 tabular-nums h-[1.65rem]">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            readOnly={isPremiumLocked}
            spellCheck={false}
            className="flex-1 min-w-0 py-4 px-4 text-[12.5px] leading-[1.65rem] font-mono
              text-white/82 bg-transparent resize-none focus:outline-none
              caret-indigo-400 selection:bg-indigo-500/20"
            style={{ tabSize: 2 }}
            placeholder={"// Tulis atau paste strategi MQL5 di sini…\n\nvoid OnTick() {\n  // kode kamu\n}"}
          />
        </div>
      </div>

      {/* ── Message bar ── */}
      {(hasErr || hasWarn || uploadMsg) && (
        <div className="shrink-0 overflow-y-auto lab-editor-scroll max-h-[60px]
          border-t border-white/[0.06] px-4 py-2 space-y-1 bg-[#0c0d15]">
          {parseErrors.map((e) => (
            <p key={e} className="flex items-start gap-1.5 text-[11px] text-red-400">
              <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{e}
            </p>
          ))}
          {parseWarnings.map((w) => (
            <p key={w} className="flex items-start gap-1.5 text-[11px] text-amber-400/85">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}
            </p>
          ))}
          {uploadMsg && (
            <p className="flex items-start gap-1.5 text-[11px] text-green-400/85">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />{uploadMsg}
            </p>
          )}
        </div>
      )}

      {/* ── API Reference collapsible ── */}
      <div className="shrink-0 border-t border-white/[0.05]">
        <button type="button" onClick={() => setRefOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-1.5 text-[10px] font-semibold
            uppercase tracking-widest text-white/22 hover:text-white/40 hover:bg-white/[0.02] transition-all">
          <div className="flex items-center gap-2">
            <FileCode className="w-3 h-3" />
            <span>{isSmcStrategy ? "Alur SMC v1.50" : "API Reference MQL5"}</span>
          </div>
          {refOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {refOpen && (
          <div className="px-4 py-2.5 text-[11px] text-white/35 font-mono leading-relaxed
            bg-[#070810] border-t border-white/[0.04] max-h-[56px] overflow-y-auto lab-editor-scroll">
            {isSmcStrategy
              ? "H1 Bias → Sweep → Displacement → MSS → FVG/IFVG return → Entry"
              : "input int/double · OnTick() · iRSI · iMA · iEMA · iATR · Close/High/Low · SignalBuy(sl,tp) · SignalSell(sl,tp)"}
          </div>
        )}
      </div>
    </section>
  );
}
