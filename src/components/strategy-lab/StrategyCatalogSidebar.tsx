"use client";

import { Lock, Star, Zap, LineChart, TrendingUp, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import type { CatalogStrategy } from "@/lib/strategy-lab";

const META: Record<string, { icon: typeof Zap; accent: string; glow: string; badge: string }> = {
  "rsi-ma-starter": {
    icon: LineChart,
    accent: "text-sky-400",
    glow:   "lab-card-glow-indigo",
    badge:  "bg-sky-500/10 text-sky-300 border-sky-500/20",
  },
  "ts-smc-pro": {
    icon: Zap,
    accent: "text-amber-400",
    glow:   "lab-card-glow-amber",
    badge:  "bg-amber-500/10 text-amber-300 border-amber-500/20",
  },
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i}
          className={`w-2.5 h-2.5 ${i <= Math.round(rating)
            ? "fill-amber-400 text-amber-400"
            : "fill-white/8 text-white/8"}`}
        />
      ))}
      <span className="ml-1 text-[10px] text-white/35 font-mono tabular-nums">{rating.toFixed(1)}</span>
    </div>
  );
}

interface Props {
  strategies: CatalogStrategy[];
  selectedId: string;
  unlocked: boolean;
  onSelect: (s: CatalogStrategy) => void;
}

export default function StrategyCatalogSidebar({ strategies, selectedId, unlocked, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const filtered = strategies.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#080910]">

      {/* ── Header ── */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Strategy Library
          </span>
        </div>
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari strategi…"
            className="w-full pl-8 pr-3 py-2 rounded-lg text-[12px] bg-white/[0.04] border border-white/[0.08]
              text-white/70 placeholder:text-white/25 focus:outline-none focus:border-indigo-500/40
              focus:bg-white/[0.06] transition-all"
          />
        </div>
      </div>

      {/* ── Count ── */}
      <div className="shrink-0 px-4 py-2 border-b border-white/[0.04]">
        <p className="text-[10px] text-white/25">{filtered.length} strategi</p>
      </div>

      {/* ── Cards ── */}
      <div className="flex-1 overflow-y-auto signal-scroll p-3 space-y-2">
        {filtered.map((strategy) => {
          const active  = selectedId === strategy.id;
          const locked  = strategy.tier === "premium" && !unlocked;
          const isPro   = strategy.tier === "premium";
          const meta    = META[strategy.id] ?? { icon: LineChart, accent: "text-white/50", glow: "lab-card-glow-indigo", badge: "bg-white/8 text-white/50 border-white/10" };
          const Icon    = meta.icon;

          return (
            <button
              key={strategy.id}
              type="button"
              onClick={() => onSelect(strategy)}
              className={`group relative w-full text-left rounded-2xl border p-3.5 transition-all duration-200 ${meta.glow}
                ${active
                  ? "border-indigo-500/40 bg-indigo-500/[0.07] lab-card-active-indigo"
                  : "border-white/[0.07] bg-white/[0.02]"
                }`}
            >
              {/* Active side bar */}
              {active && (
                <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full bg-indigo-400" />
              )}

              <div className="flex gap-3 items-start">
                {/* Icon box */}
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center
                  ${isPro ? "bg-amber-500/10 ring-1 ring-amber-500/20" : "bg-indigo-500/10 ring-1 ring-indigo-500/20"}`}>
                  <Icon className={`w-4 h-4 ${meta.accent}`} />
                </div>

                <div className="min-w-0 flex-1">
                  {/* Name + badge */}
                  <div className="flex items-start gap-2 mb-1">
                    <span className={`text-[13px] font-semibold leading-tight flex-1 min-w-0 truncate
                      ${active ? "text-white" : "text-white/80 group-hover:text-white/95"} transition-colors`}>
                      {strategy.name}
                    </span>
                    <span className={`shrink-0 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider
                      rounded border ${meta.badge}`}>
                      {isPro ? "Pro" : "Free"}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-white/35 leading-relaxed line-clamp-2 mb-2.5">
                    {strategy.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <StarRow rating={strategy.rating} />
                    <div className="flex items-center gap-1">
                      {locked && <Lock className="w-2.5 h-2.5 text-amber-400/60" />}
                      <span className={`text-[11px] font-bold ${
                        strategy.priceLabel === "Gratis" ? "text-indigo-400" : "text-amber-300"
                      }`}>
                        {strategy.priceLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow on active */}
              {active && (
                <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400/60" />
              )}
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-[12px] text-white/25">Tidak ada hasil untuk "{query}"</p>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-4 py-3 border-t border-white/[0.05]">
        <p className="text-[10px] text-white/18 text-center">
          Upload .mq5 via toolbar editor ↑
        </p>
      </div>
    </div>
  );
}
