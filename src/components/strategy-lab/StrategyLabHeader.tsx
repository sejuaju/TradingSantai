"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Play, Loader2, FlaskConical, CheckCheck, Circle } from "lucide-react";

const STEPS = [
  { n: 1, label: "Pilih" },
  { n: 2, label: "Edit" },
  { n: 3, label: "Backtest" },
  { n: 4, label: "Export" },
];

interface Props {
  running: boolean;
  strategyName: string;
  isSmcStrategy: boolean;
  onRunBacktest: () => void;
  runDisabled: boolean;
  activeStep?: number;
}

export default function StrategyLabHeader({
  running, strategyName, isSmcStrategy,
  onRunBacktest, runDisabled, activeStep = 2,
}: Props) {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center border-b border-white/[0.07] bg-[#07080f]/96 backdrop-blur-xl">
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <div className="w-full max-w-[1860px] mx-auto px-4 sm:px-6 flex items-center gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative w-7 h-7">
            <div className="absolute inset-0 rounded-full bg-indigo-500/25 blur-md group-hover:bg-indigo-500/40 transition-all" />
            <Image src="/logo.png" alt="TS" width={28} height={28}
              className="relative rounded-full ring-1 ring-white/10 group-hover:ring-indigo-400/40 transition-all" />
          </div>
          <span className="text-sm font-semibold text-white/70 group-hover:text-white/95 transition-colors hidden sm:block">
            Trading Santai
          </span>
        </Link>

        <ChevronRight className="w-3.5 h-3.5 text-white/15 shrink-0 hidden sm:block" />

        {/* ── Lab badge ── */}
        <div className="flex items-center gap-2 shrink-0">
          <FlaskConical className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-white">Strategy Lab</span>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold
            bg-indigo-500/12 text-indigo-300 border border-indigo-500/20 tracking-wide">
            {isSmcStrategy ? "SMC" : "MQL5"}
          </span>
        </div>

        {/* ── Steps ── */}
        <div className="hidden xl:flex items-center gap-0.5 mx-auto">
          {STEPS.map((s, i) => {
            const done   = s.n < activeStep;
            const active = s.n === activeStep;
            return (
              <div key={s.n} className="flex items-center">
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all select-none ${
                  active
                    ? "bg-indigo-500/18 text-indigo-300 border border-indigo-500/35 lab-step-active"
                    : done
                    ? "text-white/40 border border-transparent"
                    : "text-white/20 border border-transparent"
                }`}>
                  {done
                    ? <CheckCheck className="w-3 h-3 text-indigo-400/70" />
                    : <Circle className={`w-2 h-2 ${active ? "fill-indigo-400 text-indigo-400" : "fill-white/15 text-white/15"}`} />
                  }
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 h-px mx-1 ${done ? "bg-indigo-500/30" : "bg-white/[0.05]"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right ── */}
        <div className="flex items-center gap-3 ml-auto xl:ml-0 shrink-0">
          {/* Strategy name */}
          <div className="hidden lg:block text-right">
            <p className="text-[10px] text-white/25 leading-none mb-0.5">Aktif</p>
            <p className="text-xs text-white/60 font-medium truncate max-w-[150px]">{strategyName}</p>
          </div>

          {/* Status dot */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl
            bg-white/[0.03] border border-white/[0.07]">
            <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-cyan-400 animate-pulse" : "bg-white/25"}`} />
            <span className="text-[10px] text-white/40 whitespace-nowrap font-medium">
              {running ? "Running…" : "Demo · EUR M5"}
            </span>
          </div>

          {/* Run button */}
          <button
            type="button"
            onClick={onRunBacktest}
            disabled={runDisabled || running}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all active:scale-[0.97]
              bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-35 disabled:cursor-not-allowed
              ${!running && !runDisabled ? "lab-run-idle" : ""}`}
          >
            {running
              ? <Loader2 className="w-4 h-4 lab-spin" />
              : <Play className="w-4 h-4 fill-current" />
            }
            <span className="hidden xs:inline whitespace-nowrap">
              {running ? "Running…" : "Run Backtest"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
