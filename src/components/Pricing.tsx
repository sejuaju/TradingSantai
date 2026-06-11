"use client";

import { Check, Star } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "99K",
    period: "/bulan",
    description: "Cocok untuk pemula yang baru mulai belajar trading.",
    features: [
      "Akses komunitas Telegram",
      "Sinyal trading basic (5x/minggu)",
      "Materi edukasi dasar",
      "Update market harian",
      "Support via grup",
    ],
    popular: false,
    cta: "Pilih Starter",
  },
  {
    name: "Pro",
    price: "249K",
    period: "/bulan",
    description: "Untuk trader yang serius mau konsisten profit.",
    features: [
      "Semua fitur Starter",
      "Sinyal premium (unlimited)",
      "Live analysis harian",
      "Sesi mentoring grup mingguan",
      "Akses recording materi",
      "Risk management guide",
      "Priority support",
    ],
    popular: true,
    cta: "Pilih Pro",
  },
  {
    name: "VIP",
    price: "499K",
    period: "/bulan",
    description: "Full access + private mentoring 1-on-1.",
    features: [
      "Semua fitur Pro",
      "Private mentoring 1-on-1",
      "Custom trading plan",
      "Portfolio review bulanan",
      "Akses strategy playbook",
      "Exclusive VIP group",
      "24/7 priority support",
      "Early access fitur baru",
    ],
    popular: false,
    cta: "Pilih VIP",
  },
];

export default function Pricing() {
  return (
    <section id="harga" className="relative py-24">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/5 rounded-full blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-wider uppercase text-accent bg-accent/10 rounded-full mb-4">
            Harga
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Investasi untuk{" "}
            <span className="gradient-text">Masa Depan Trading Kamu</span>
          </h2>
          <p className="mt-4 text-lg text-muted">
            Pilih plan yang sesuai kebutuhan. Semua plan bisa upgrade atau downgrade kapan saja.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative glass-card rounded-2xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                plan.popular
                  ? "border-accent/50 animate-pulse-glow"
                  : "hover:border-accent/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold bg-accent text-black rounded-full">
                    <Star className="w-3 h-3" />
                    PALING POPULER
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className="text-sm text-muted">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-extrabold">Rp {plan.price}</span>
                <span className="text-muted text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <span className="text-muted">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                  plan.popular
                    ? "bg-accent hover:bg-accent-light text-black shadow-lg shadow-accent/20"
                    : "border border-card-border hover:border-accent/30 text-foreground"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Trust Badge */}
        <p className="text-center text-sm text-muted mt-10">
          Pembayaran aman via Transfer Bank, QRIS, E-Wallet & kartu kredit. Garansi uang kembali 7 hari.
        </p>
      </div>
    </section>
  );
}
