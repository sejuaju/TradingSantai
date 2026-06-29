"use client";

import type { ComponentType } from "react";
import {
  AlertCircle,
  Activity,
  TrendingDown,
  TrendingUp,
  Target,
  BarChart2,
  Loader2,
} from "lucide-react";
import type { BacktestResult } from "@/lib/strategy-lab";

function formatPnl(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(5)}`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  result: BacktestResult | null;
  isSmcStrategy: boolean;
  smcBarCount: number;
  running?: boolean;
}

export default function BacktestResultsPanel({
  result,
  isSmcStrategy,
  smcBarCount,
  running = false,
}: Props) {
  return (
    <div className="flex flex-col h-full min-h-0 border-l border-white/[0.06] bg-[#0c0c0d]/60">
      <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
            Performance
          </p>
          <p className="text-[11px] text-white/25 mt-0.5">Backtest analytics</p>
        </div>
        <Activity className="w-4 h-4 text-white/20" />
      </div>

      <div className="flex-1 overflow-y-auto signal-scroll p-4 min-h-[420px]">
        {running ? (
          <RunningState />
        ) : !result ? (
          <EmptyState isSmcStrategy={isSmcStrategy} smcBarCount={smcBarCount} />
        ) : !result.ok ? (
          <ErrorState message={result.error ?? "Unknown error"} />
        ) : (
          <SuccessState result={result} />
        )}
      </div>
    </div>
  );
}

function RunningState() {
  return (
    <div className="h-full min-h-[360px] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-accent animate-spin" />
      <p className="text-sm text-white/45">Menjalankan backtest…</p>
      <div className="w-48 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full w-1/2 rounded-full bg-accent/60 animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState({
  isSmcStrategy,
  smcBarCount,
}: {
  isSmcStrategy: boolean;
  smcBarCount: number;
}) {
  return (
    <div className="h-full min-h-[360px] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent flex items-center justify-center mb-5">
        <BarChart2 className="w-8 h-8 text-white/15" />
      </div>
      <p className="text-sm font-medium text-white/55">Belum ada hasil</p>
      <p className="text-xs text-white/35 mt-2 max-w-[200px] leading-relaxed">
        Dataset demo EUR · {isSmcStrategy ? `${smcBarCount}` : "200"} bar M5
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 flex gap-3">
      <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
      <div>
        <p className="text-sm font-medium text-red-300">Backtest gagal</p>
        <p className="text-xs text-red-400/70 mt-1">{message}</p>
      </div>
    </div>
  );
}

function SuccessState({ result }: { result: BacktestResult }) {
  const winPct = Math.min(100, result.winRate);

  return (
    <div className="space-y-4">
      {result.engine && (
        <div className="px-3 py-2 rounded-lg bg-accent/[0.06] border border-accent/15">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-accent/80">
            {result.engine}
          </p>
        </div>
      )}

      {/* Win rate ring */}
      <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-br from-white/[0.04] to-transparent p-5">
        <div className="flex items-center gap-5">
          <div
            className="relative w-[4.5rem] h-[4.5rem] shrink-0 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(#22c55e ${winPct * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
            }}
          >
            <div className="absolute inset-[5px] rounded-full bg-[#0c0c0d] flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-white tabular-nums leading-none">
                {result.winRate.toFixed(0)}
              </span>
              <span className="text-[9px] text-white/35">%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/35">Win Rate</p>
            <p className="text-2xl font-bold text-white mt-0.5 tabular-nums">
              {result.winRate.toFixed(1)}%
            </p>
            <p className="text-[11px] text-white/35 mt-1">
              {result.totalTrades} trade · {result.signals.length} signal
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Kpi
          label="Net P/L"
          value={formatPnl(result.netPnl)}
          icon={result.netPnl >= 0 ? TrendingUp : TrendingDown}
          tone={result.netPnl >= 0 ? "up" : "down"}
        />
        <Kpi label="Profit Factor" value={result.profitFactor.toFixed(2)} icon={Target} />
        <Kpi label="Max DD" value={formatPnl(-result.maxDrawdown)} icon={TrendingDown} tone="down" />
        <Kpi label="Trades" value={String(result.totalTrades)} icon={BarChart2} />
      </div>

      {result.trades.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30 mb-2.5">
            Trade History
          </p>
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto signal-scroll pr-0.5">
            {result.trades.map((t, i) => (
              <div
                key={`${t.entryTime}-${i}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#0a0a0b] border border-white/[0.05] hover:border-white/[0.08] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`shrink-0 w-1 h-8 rounded-full ${
                      t.type === "BUY" ? "bg-accent" : "bg-red-500"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white/80">{t.type}</p>
                    <p className="text-[10px] text-white/35 truncate">{formatTime(t.entryTime)}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-semibold tabular-nums ${
                      t.result === "win" ? "text-accent" : "text-red-400"
                    }`}
                  >
                    {formatPnl(t.pnl)}
                  </p>
                  <p className="text-[9px] uppercase text-white/25">{t.result}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: "up" | "down" | "neutral";
}) {
  const color =
    tone === "up" ? "text-accent" : tone === "down" ? "text-red-400/90" : "text-white/85";

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0b] px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-white/25" />
        <p className="text-[9px] uppercase tracking-wider text-white/30">{label}</p>
      </div>
      <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}