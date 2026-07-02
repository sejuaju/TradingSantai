"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { AuthInsight } from "@/lib/authInsights";
import { pickHourlyInsight } from "@/lib/hourlyInsight";

interface HourlyInsightPopupProps {
  onDismiss: () => void;
}

export default function HourlyInsightPopup({ onDismiss }: HourlyInsightPopupProps) {
  const [insight, setInsight] = useState<AuthInsight | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setInsight(pickHourlyInsight());
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onDismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-8 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hourly-insight-title"
    >
      <div
        className={`absolute inset-0 bg-[#05060c]/25 backdrop-blur-[2px] transition-opacity duration-500 pointer-events-auto ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onDismiss}
        aria-hidden
      />

      <div
        className={`relative w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl pointer-events-auto transition-all duration-700 ease-out ${
          visible
            ? "opacity-100 translate-y-0 scale-100 insight-glow"
            : "opacity-0 translate-y-6 scale-[0.97]"
        }`}
      >
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/30 via-white/10 to-emerald-400/20 opacity-70 blur-sm animate-insight-border" />

        <div className="relative rounded-2xl sm:rounded-3xl border border-white/15 bg-white/[0.06] backdrop-blur-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <div
            className="absolute inset-0 opacity-60 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 10% 0%, rgba(99,102,241,0.18), transparent 55%), " +
                "radial-gradient(ellipse 50% 40% at 90% 100%, rgba(34,197,94,0.10), transparent 50%)",
            }}
          />

          <div className="relative p-6 sm:p-8 lg:px-12 lg:py-10 text-center">
            <button
              type="button"
              onClick={onDismiss}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-lg text-white/35 hover:text-white/80 hover:bg-white/5 transition-colors"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Brand — satu pill horizontal */}
            <div className="flex justify-center mb-7 sm:mb-9">
              <div className="inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10">
                <Image
                  src="/logo.png"
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full shrink-0"
                  aria-hidden
                />
                <span className="text-sm font-semibold text-white/85">Trading Santai</span>
                <span className="w-px h-3.5 bg-white/15 shrink-0" aria-hidden />
                <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">
                  Check in
                </span>
              </div>
            </div>

            {insight && (
              <div className="mx-auto max-w-2xl">
                <span className="inline-flex mb-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-accent/90 bg-accent/10 border border-accent/20">
                  {insight.tag}
                </span>

                <h2
                  id="hourly-insight-title"
                  className="text-xl sm:text-2xl lg:text-[1.65rem] font-bold text-white/95 leading-snug mb-4 sm:mb-5"
                >
                  {insight.title}
                </h2>
                <p className="text-sm sm:text-[15px] text-white/60 leading-relaxed">
                  {insight.body}
                </p>
                {insight.footnote && (
                  <p className="mt-5 pt-4 border-t border-white/10 text-xs sm:text-[13px] text-white/40 leading-relaxed italic">
                    {insight.footnote}
                  </p>
                )}

                <button
                  type="button"
                  onClick={onDismiss}
                  className="mt-6 sm:mt-8 mx-auto min-w-[220px] py-3 px-8 text-sm font-semibold text-white/90 rounded-xl border border-white/15 bg-white/[0.06] hover:bg-white/[0.10] hover:border-white/25 transition-all"
                >
                  Mengerti, lanjutkan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}