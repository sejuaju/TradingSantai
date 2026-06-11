import { Star, BarChart3, Heart } from "lucide-react";

const features = [
  {
    icon: Star,
    label: "LEARNING & NETWORKING",
    title: "Build a solid foundation in basic to intermediate trading concepts",
    description:
      "Access a wealth of educational materials, tutorials, and webinars curated to enhance your trading skills. Our comprehensive resources cater to traders of all levels, providing a structured learning path for continuous improvement.",
    accent: true,
  },
  {
    icon: BarChart3,
    label: "TECHNICAL ANALYSIS",
    title: "Join your trading journey without selling signals",
    description:
      "Engage in vibrant discussions, ask questions, and participate in live chats with fellow traders and mentors. Trading Santai isn't just a community; it's a collaborative space where knowledge is shared, and friendships are formed.",
    accent: false,
  },
  {
    icon: Heart,
    label: "EXCLUSIVE SUPPORT SYSTEMS",
    title: "Increase productivity with our daily and weekly events",
    description:
      "Join our live sessions where seasoned analysts break down the intricacies of forex and cryptocurrency markets in real-time. Gain valuable insights and make informed decisions backed by expert perspectives.",
    accent: false,
  },
];

export default function Features() {
  return (
    <section id="fitur" className="py-24 bg-[#0f0f0f]">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-10">
        {/* Section Header */}
        <div className="text-center max-w-5xl mx-auto mb-16">
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-4">
            WHY TRADING SANTAI HUB
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-normal tracking-tight leading-tight text-white">
            Empower Your Trading Journey with Expert Insights and
            Community Support
          </h2>
        </div>

        {/* Feature Cards - 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.label}
                className={`rounded-2xl p-8 transition-all duration-300 ${
                  feature.accent
                    ? "bg-[#1a2e1a] border border-accent/20"
                    : "bg-[#1a1a2e] border border-white/5"
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${
                    feature.accent
                      ? "bg-accent/20"
                      : "bg-white/5"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${feature.accent ? "text-accent" : "text-accent"}`} />
                </div>

                {/* Label */}
                <p className="text-[10px] font-semibold text-accent uppercase tracking-widest mb-3">
                  {feature.label}
                </p>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-3 leading-snug">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-white/50 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
