import { MessageCircle } from "lucide-react";
import SignupButton from "@/components/auth/SignupButton";

export default function Services() {
  return (
    <section id="komunitas" className="py-24 bg-[#111111]">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left - Text */}
          <div className="lg:pt-8">
            <p className="text-sm font-medium text-accent/70 uppercase tracking-widest mb-4">
              OUR PRODUCT &amp; SERVICES
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-tight text-white mb-6">
              Empowering trading journeys one step at a time with our services
            </h2>
            <p className="text-sm text-white/50 leading-relaxed max-w-md">
              Embark on an empowered trading journey with our comprehensive services, guiding
              you one step at a time. Elevate your experience with our premium offerings,
              designed to enhance every aspect of your trading endeavors. Join our community
              and embrace a pathway to success, where personalized support and expert
              guidance converge to redefine your trading experience.
            </p>
          </div>

          {/* Right - Service Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Telegram Community */}
            <div className="rounded-2xl bg-[#1a1a2e] border border-white/5 overflow-hidden">
              {/* Telegram mockup */}
              <div className="bg-[#0e0e1a] p-3">
                <div className="rounded-lg bg-[#17172a] border border-white/5 p-3 h-40">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-blue-400">TS</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-white/70">Trading Santai Group</p>
                      <p className="text-[8px] text-white/30">1,200 members</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="bg-[#1f1f35] rounded-lg p-2">
                      <p className="text-[9px] text-white/40 leading-relaxed">
                        Malam alls pada gabut? Salam segalanya dari timur. Selamat istirahat amati DXY baru...
                      </p>
                    </div>
                    <div className="bg-[#1f1f35] rounded-lg p-2">
                      <p className="text-[9px] text-white/40 leading-relaxed">
                        Pengamat saham tebaik kasih masaly Brokenwing dua hari...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-base font-bold text-white mb-1">Telegram Community</h3>
                <a href="#" className="text-sm text-accent hover:underline">Free for All</a>
              </div>
            </div>

            {/* E-Course */}
            <div className="rounded-2xl bg-[#1a1a2e] border border-white/5 overflow-hidden">
              {/* E-Course mockup */}
              <div className="bg-[#0e0e1a] p-3">
                <div className="rounded-lg bg-[#17172a] border border-white/5 h-40 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
                  <div className="text-center relative z-10">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <p className="text-[10px] text-white/40">Video Course</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-base font-bold text-white mb-1">E-Course</h3>
                <p className="text-sm text-white/40">Unavailable for public</p>
              </div>
            </div>

            {/* Premium Community - spans full width */}
            <div className="sm:col-span-2 rounded-2xl bg-[#1a1a2e] border border-white/5 overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                <div className="p-6 flex-1">
                  <h3 className="text-xl font-bold text-white mb-4">Premium Community Membership</h3>
                  <SignupButton className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-full transition-all cursor-pointer">
                    <MessageCircle className="w-4 h-4" />
                    Sign Up Now
                  </SignupButton>
                </div>
                {/* Discord-like preview */}
                <div className="w-full sm:w-64 bg-[#0e0e1a] p-3">
                  <div className="rounded-lg bg-[#17172a] border border-white/5 p-3 h-36">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-accent">TS</span>
                      </div>
                      <p className="text-[9px] font-semibold text-white/60">Trading Santai Hub</p>
                    </div>
                    <div className="space-y-1.5">
                      {["#btc-analysis", "#daily-signal", "#market-news"].map((ch) => (
                        <div key={ch} className="flex items-center gap-1.5 py-0.5 px-2 text-[9px] text-white/30 rounded bg-white/[0.02]">
                          {ch}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 rounded bg-[#12121f] border border-white/5 p-2 h-12 flex items-end gap-[2px]">
                      {[30, 50, 40, 60, 45, 70, 55, 75, 60, 80, 65, 85].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-accent/40"
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
