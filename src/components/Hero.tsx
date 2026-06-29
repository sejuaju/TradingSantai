"use client";

import { Suspense } from "react";
import { MessageCircle } from "lucide-react";
import TradingTerminal from "./TradingTerminal";

export default function Hero() {
  return (
    <section
      id="beranda"
      className="relative flex flex-col pt-14 overflow-hidden"
    >
      <div className="max-w-[1800px] mx-auto w-full px-4 sm:px-8 lg:px-10">

        {/* ── Hero Text — centered, compact ── */}
        <div className="animate-fade-in-up flex flex-col items-center text-center py-10 lg:py-14 gap-5">

          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-accent bg-accent/10 border border-accent/20 rounded-full tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Trading Santai Hub
          </span>

          {/* Heading — satu baris di desktop */}
          <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold leading-tight tracking-tight text-white max-w-3xl">
            Over{" "}
            <span className="text-accent">3,000+</span>{" "}
            traders have joined our community
          </h1>

          {/* Powered by */}
          <p className="text-xs text-white/30 tracking-[0.22em] uppercase -mt-1">
            powered by TS
          </p>

          {/* Description */}
          <p className="text-sm sm:text-base text-white/50 leading-relaxed max-w-xl -mt-1">
            From the crypto to forex markets, Trading Santai Hub offers exclusive
            community education and financial information.
          </p>

          {/* CTA Buttons — tepat di bawah deskripsi */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
            <a
              href="#fitur"
              className="px-6 py-2.5 text-sm font-semibold text-white border border-white/20 rounded-full hover:border-white/40 hover:bg-white/5 transition-all"
            >
              Learn More
            </a>
            <a
              href="#signup"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent-dark rounded-full transition-all shadow-lg shadow-accent/25"
            >
              <MessageCircle className="w-4 h-4" />
              Sign Up Now
            </a>
          </div>
        </div>

        {/* ── Trading Terminal — full width ── */}
        <div
          className="animate-fade-in-up pb-16"
          style={{ animationDelay: "0.15s" }}
        >
          <Suspense
            fallback={
              <div className="h-[520px] rounded-2xl border border-white/8 bg-[#1a1a1a] animate-pulse" />
            }
          >
            <TradingTerminal />
          </Suspense>
        </div>

      </div>
    </section>
  );
}