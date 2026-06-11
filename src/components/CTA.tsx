import { MessageCircle } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-16 bg-[#111111]">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-10">
        <div className="rounded-3xl bg-[#22c55e] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 items-center">
            {/* Left - Text */}
            <div className="p-10 sm:p-14 lg:p-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-black leading-tight mb-3">
                Your traders&apos; community awaits you
              </h2>
              <p className="text-base text-black/70 mb-8">
                Join Trading Santai Hub and experience it for yourself
              </p>
              <a
                href="#signup"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#1a1a2e] hover:bg-[#252540] rounded-full transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Sign Up Now
              </a>
            </div>

            {/* Right - Discord mockup */}
            <div className="p-6 lg:p-8 hidden lg:block">
              <div className="rounded-2xl overflow-hidden border-2 border-[#4ade80]/50 bg-[#1e1e2e] shadow-2xl">
                {/* Window header */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a28] border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <span className="ml-2 text-[10px] text-white/40">Trading Santai Advanced Group</span>
                </div>

                {/* App body */}
                <div className="flex h-[220px]">
                  {/* Sidebar */}
                  <div className="w-40 bg-[#17172a] border-r border-white/5 p-2.5">
                    <p className="text-[8px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">
                      Analysis Update
                    </p>
                    {["announcements", "daily-trade-fx", "market-update", "btc-update", "eth-update"].map((ch) => (
                      <div
                        key={ch}
                        className={`flex items-center gap-1 py-0.5 px-1.5 text-[9px] rounded ${
                          ch === "btc-update" ? "text-white bg-white/5" : "text-white/35"
                        }`}
                      >
                        <span className="text-white/15">#</span> {ch}
                      </div>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3">
                    <div className="flex gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-[8px] font-bold text-accent shrink-0">
                        TS
                      </div>
                      <div>
                        <span className="text-[9px] font-semibold text-accent">Trading Santai</span>
                        <p className="text-[8px] text-white/30 mt-0.5 leading-relaxed">
                          Daily reminder: BTC perspective TF Daily showing strong reaction...
                        </p>
                      </div>
                    </div>
                    <div className="rounded bg-[#12121f] border border-white/5 p-2 h-24 flex items-end gap-[2px]">
                      {[40, 55, 35, 60, 45, 70, 50, 65, 75, 55, 80, 60, 45, 70, 85, 65, 50, 75].map((h, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-t-sm ${i > 12 ? "bg-accent/50" : "bg-white/10"}`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
