import { Coins, Monitor, BookOpen, BarChart3, Users, Video } from "lucide-react";

const benefitsStep1 = [
  {
    icon: Coins,
    title: "Earn TS points for every transaction",
    description:
      "Enjoy the perks and benefits that come with accumulating TS points, turning your regular interactions into opportunities for exciting rewards and exclusive privileges.",
  },
  {
    icon: Monitor,
    title: "Monitoring your membership",
    description:
      "Our monitoring system is designed to enhance your experience, offering real-time badges and proactive support, so you can make the most of your membership at every step of the way.",
  },
  {
    icon: BookOpen,
    title: "Get more exclusive content",
    description:
      "From in-depth articles to exclusive multimedia, our platform offers a wealth of valuable content, ensuring you stay informed, entertained, and enriched with every visit.",
  },
];

const benefitsStep2 = [
  {
    icon: BarChart3,
    title: "Intensive Market updates",
    description:
      "Stay at the forefront of market dynamics with our Intensive Market Updates. Dive into a comprehensive analysis of the latest trends, news, and crucial developments that impact your financial landscape.",
  },
  {
    icon: Users,
    title: "Unique community supports",
    description:
      "Discover the exceptional support within our unique community. We pride ourselves on offering tailored assistance, fostering collaborative engagement, and connecting you with a network of like-minded individuals.",
  },
  {
    icon: Video,
    title: "Live streaming with Kevin Sailly",
    description:
      "Embark on an immersive experience with 'Live Streaming with Kevin Sailly'. Join us as Kevin Sailly takes center stage in dynamic live sessions where he shares valuable insights, explores exciting topics, and engages with the audience in real-time.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 bg-[#111111]">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-10">
        {/* Section Header */}
        <div className="text-center max-w-5xl mx-auto mb-12">
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-4">
            HOW IT WORKS
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-normal tracking-tight leading-tight text-white">
            Two simple steps to join our exclusive community
          </h2>
        </div>

        {/* ===== STEP 1 — ONE CARD containing everything ===== */}
        <div className="rounded-2xl border border-white/8 bg-[#161627] overflow-visible max-w-[1100px] mx-auto">
          {/* Top: Illustration left + Text right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            <div className="relative min-h-[420px]">
              <svg
                viewBox="0 0 400 350"
                className="absolute bottom-4 left-4 lg:left-8 w-[90%] max-w-[480px]"
                style={{ top: "-40px" }}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect x="40" y="120" width="320" height="210" rx="16" fill="#1a3a2a" opacity="0.5" />
                <circle cx="120" cy="70" r="22" fill="#22c55e" opacity="0.5" />
                <ellipse cx="120" cy="72" rx="5" ry="4" fill="#111" opacity="0.3" />
                <rect x="95" y="90" width="50" height="70" rx="20" fill="#22c55e" opacity="0.4" />
                <rect x="85" y="130" width="30" height="50" rx="8" fill="#22c55e" opacity="0.3" transform="rotate(-15, 85, 130)" />
                <rect x="130" y="130" width="30" height="50" rx="8" fill="#22c55e" opacity="0.3" transform="rotate(15, 130, 130)" />
                <circle cx="280" cy="55" r="18" fill="#22c55e" opacity="0.45" />
                <rect x="260" y="72" width="40" height="55" rx="16" fill="#22c55e" opacity="0.35" />
                <rect x="130" y="160" width="150" height="110" rx="10" fill="#0f1520" stroke="#2a2a4a" strokeWidth="2" />
                <rect x="140" y="170" width="130" height="80" rx="6" fill="#141428" />
                {[0,1,2,3,4,5,6,7,8,9].map((i) => {
                  const heights = [30,45,25,55,40,60,35,50,65,42];
                  return (
                    <rect key={i} x={148+i*12} y={250-heights[i]} width="8" rx="2" height={heights[i]}
                      fill={i<5?"#22c55e":"#4ade80"} opacity={0.5+(i*0.05)} />
                  );
                })}
                <circle cx="185" cy="260" r="3" fill="#22c55e" opacity="0.6" />
                <circle cx="200" cy="260" r="3" fill="#ef4444" opacity="0.5" />
                <circle cx="215" cy="260" r="3" fill="#22c55e" opacity="0.6" />
                <circle cx="230" cy="260" r="3" fill="#22c55e" opacity="0.4" />
                <polyline points="80,190 140,175 200,195 240,165 270,200 340,220" stroke="#eab308" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" fill="none" />
                <polygon points="340,220 328,212 332,224" fill="#eab308" opacity="0.7" />
                <circle cx="330" cy="290" r="24" fill="#3b82f6" opacity="0.35" />
                <rect x="180" y="285" width="18" height="14" rx="2" fill="#eab308" opacity="0.4" />
                <rect x="200" y="285" width="18" height="14" rx="2" fill="#eab308" opacity="0.35" />
                <rect x="190" y="275" width="18" height="14" rx="2" fill="#eab308" opacity="0.45" />
                <rect x="210" y="275" width="18" height="14" rx="2" fill="#d97706" opacity="0.35" />
                <rect x="200" y="265" width="18" height="14" rx="2" fill="#eab308" opacity="0.5" />
                <rect x="55" y="280" width="40" height="15" rx="7" fill="#3b82f6" opacity="0.25" transform="rotate(-30, 55, 280)" />
              </svg>
            </div>
            <div className="p-8 lg:py-16 lg:pr-10 lg:pl-4 flex flex-col justify-center">
              <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-4">
                TRADING SANTAI HUB WEB
              </p>
              <h3 className="text-2xl sm:text-[1.7rem] font-bold text-white mb-5 leading-snug">
                1. Register and subscribe your membership
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Seamlessly register and elevate your experience by subscribing to our membership.
                Unlock a world of exclusive benefits, tailored to enhance your journey with us.
              </p>
            </div>
          </div>

          {/* Divider INSIDE card */}
          <div className="border-t border-white/8 mx-8" />

          {/* 3 Benefit cards INSIDE card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 lg:px-10 lg:py-10">
            {benefitsStep1.map((b) => (
              <div key={b.title}>
                <h4 className="text-sm font-bold text-white mb-3">{b.title}</h4>
                <p className="text-xs text-white/40 leading-relaxed">
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== STEP 2 — ONE CARD containing everything ===== */}
        <div className="rounded-2xl border border-white/8 bg-[#161627] overflow-hidden mt-8 max-w-[1100px] mx-auto">
          {/* Step 2 text */}
          <div className="p-8 lg:p-12 min-h-[240px]">
            <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-3">
              DISCORD CHANNEL
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-snug max-w-lg">
              2. You will be invited to our premium Discord server
            </h3>
            <p className="text-sm text-white/50 leading-relaxed max-w-xl">
              Once registered and subscribed, an exclusive invitation awaits you to join our
              premium Discord server. Immerse yourself in a dynamic community where
              valuable insights, expert guidance, and exclusive content converge.
            </p>
          </div>

          {/* Divider INSIDE card */}
          <div className="border-t border-white/8 mx-8" />

          {/* 3 Benefit cards INSIDE card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 lg:px-10 lg:py-10">
            {benefitsStep2.map((b) => (
              <div key={b.title}>
                <h4 className="text-sm font-bold text-white mb-3">{b.title}</h4>
                <p className="text-xs text-white/40 leading-relaxed">
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
