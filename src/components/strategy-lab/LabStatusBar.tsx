"use client";

import { GitBranch, Cpu, Database } from "lucide-react";

interface Props {
  isSmcStrategy: boolean;
  lineCount: number;
  hasResult: boolean;
  engine?: string;
}

export default function LabStatusBar({
  isSmcStrategy,
  lineCount,
  hasResult,
  engine,
}: Props) {
  return (
    <footer className="flex items-center justify-between gap-3 px-4 py-2 border-t border-white/[0.06] bg-[#080809] text-[10px] text-white/35 font-medium">
      <div className="flex items-center gap-4 min-w-0">
        <span className="flex items-center gap-1.5 shrink-0">
          <Database className="w-3 h-3 text-white/25" />
          EUR · M5 · Demo
        </span>
        <span className="flex items-center gap-1.5 shrink-0 hidden sm:flex">
          <GitBranch className="w-3 h-3 text-white/25" />
          {lineCount} lines
        </span>
        <span className="flex items-center gap-1.5 truncate hidden md:flex">
          <Cpu className="w-3 h-3 text-white/25" />
          {engine ?? (isSmcStrategy ? "TS SMC EA v1.50" : "TS-MQL5 Sandbox")}
        </span>
      </div>
      <span className={`shrink-0 ${hasResult ? "text-accent/70" : "text-white/30"}`}>
        {hasResult ? "Backtest selesai" : "Siap"}
      </span>
    </footer>
  );
}