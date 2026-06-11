import Image from "next/image";
import { TrendingUp, MessageCircle, Globe, Mail } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Exclusive Community", href: "#komunitas" },
    { label: "E-Course", href: "#ecourse" },
    { label: "Telegram Group", href: "#" },
  ],
  Company: [
    { label: "About Us", href: "#beranda" },
    { label: "Why Us", href: "#fitur" },
    { label: "Services", href: "#komunitas" },
  ],
  Legal: [
    { label: "Terms & Conditions", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Disclaimer", href: "#" },
  ],
};

const socials = [
  { icon: Globe, href: "#", label: "Website" },
  { icon: MessageCircle, href: "#", label: "Telegram" },
  { icon: Mail, href: "#", label: "Email" },
];

const paymentLogos = [
  { name: "Visa", logo: "/payments/visa.png" },
  { name: "Mastercard", logo: "/payments/mastercard.png" },
  { name: "BCA", logo: "/payments/bca.png" },
  { name: "Mandiri", logo: "/payments/mandiri.png" },
  { name: "BRI", logo: "/payments/bri.png" },
  { name: "Dana", logo: "/payments/dana.png" },
  { name: "GoPay", logo: "/payments/gopay.png" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0d0d0d]">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-10 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#beranda" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-white">
                Trading Santai
              </span>
            </a>
            <p className="text-sm text-white/40 leading-relaxed max-w-xs mb-6">
              Komunitas trader Indonesia. Edukasi, komunitas eksklusif, dan analisis market untuk perjalanan trading yang lebih baik.
            </p>
            <div className="flex items-center gap-2.5">
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all duration-200"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-white/35 hover:text-white/70 transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment Available */}
        <div className="mt-12 pt-6 border-t border-white/5">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">
            Payment Available
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {paymentLogos.map((p) => (
              <div key={p.name} className="h-12 px-4 rounded-lg bg-white flex items-center justify-center relative">
                <Image 
                  src={p.logo} 
                  alt={p.name} 
                  width={80}
                  height={32}
                  className="object-contain" 
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} Trading Santai. All rights reserved.
          </p>
          <p className="text-xs text-white/25">
            Trading involves risk. Make sure you understand the risks before transacting.
          </p>
        </div>
      </div>
    </footer>
  );
}
