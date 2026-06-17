"use client";

import { useState } from "react";
import Image from "next/image";
import { Instrument } from "./config";

// ─── Currency → Emoji Flag ────────────────────────────────────────────────────
const CURRENCY_TO_FLAG: Record<string, string> = {
  EUR: "🇪🇺",
  USD: "🇺🇸",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  AUD: "🇦🇺",
  CAD: "🇨🇦",
  CHF: "🇨🇭",
  NZD: "🇳🇿",
  HKD: "🇭🇰",
  SGD: "🇸🇬",
  SEK: "🇸🇪",
  NOK: "🇳🇴",
  DKK: "🇩🇰",
  MXN: "🇲🇽",
  ZAR: "🇿🇦",
  TRY: "🇹🇷",
  CNH: "🇨🇳",
  CNY: "🇨🇳",
};

// ─── Crypto Symbol → CoinCap Icon Name ───────────────────────────────────────
// Beberapa crypto di CoinCap menggunakan nama yang berbeda dari symbol-nya
const CRYPTO_ICON_MAPPING: Record<string, string> = {
  bnb: "bnb3",    // Binance Coin menggunakan "bnb3" di CoinCap
  ada: "ada4",    // Cardano menggunakan "ada4" di CoinCap
  dot: "dot2",    // Polkadot menggunakan "dot2" di CoinCap
  // Tambahkan mapping khusus lainnya di sini jika diperlukan
};

// ─── Stock Symbol → Company Domain ───────────────────────────────────────────
const STOCK_DOMAIN: Record<string, string> = {
  AAPL:  "apple.com",
  MSFT:  "microsoft.com",
  GOOGL: "google.com",
  GOOG:  "google.com",
  AMZN:  "amazon.com",
  TSLA:  "tesla.com",
  NVDA:  "nvidia.com",
  META:  "meta.com",
  NFLX:  "netflix.com",
  AMD:   "amd.com",
  INTC:  "intel.com",
  PYPL:  "paypal.com",
  V:     "visa.com",
  MA:    "mastercard.com",
  JPM:   "jpmorganchase.com",
  WMT:   "walmart.com",
  KO:    "coca-cola.com",
};

// ─── Props ────────────────────────────────────────────────────────────────────
// ─── Commodity Visual Mapping ────────────────────────────────
// Komoditas tidak punya "logo perusahaan" — pakai icon custom inline (SVG, TANPA
// CDN luar) supaya tidak rawan putus seperti kasus Clearbit kemarin. WTI & Brent
// sama-sama "minyak mentah" jadi shape barel-nya identik, tapi dibedakan lewat
// badge bendera kecil (reuse pola yang sama dengan dual-flag forex di atas).
const COMMODITY_VISUAL: Record<string, { kind: "gold" | "silver" | "oil"; flag?: string }> = {
  XAUUSD: { kind: "gold" },
  XAGUSD: { kind: "silver" },
  XTIUSD: { kind: "oil", flag: "🇺🇸" }, // WTI = West Texas Intermediate
  XBRUSD: { kind: "oil", flag: "🇬🇧" }, // Brent = North Sea / ICE London
};

function BullionBarIcon({ size, metal }: { size: number; metal: "gold" | "silver" }) {
  const c = metal === "gold"
    ? { light: "#FDE08D", mid: "#D4AF37", dark: "#9C7A23" }
    : { light: "#F2F4F6", mid: "#C0C5CC", dark: "#888D96" };
  const gradId = `bullion-${metal}`;

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="55%" stopColor={c.mid} />
          <stop offset="100%" stopColor={c.dark} />
        </linearGradient>
      </defs>
      {/* Top face — kesan 3D */}
      <path d="M7 7 L17 7 L19.5 9 L4.5 9 Z" fill={c.light} />
      {/* Front face */}
      <path d="M4.5 9 L19.5 9 L21 18 L3 18 Z" fill={`url(#${gradId})`} stroke={c.dark} strokeWidth="0.5" />
      {/* Shine stripe */}
      <path d="M7 10.5 L9 10.5 L8 16.5 L6 16.5 Z" fill="#fff" opacity={0.25} />
    </svg>
  );
}

function OilBarrelIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="oil-barrel-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3a2f28" />
          <stop offset="50%" stopColor="#1c1714" />
          <stop offset="100%" stopColor="#0d0a08" />
        </linearGradient>
      </defs>
      <ellipse cx="12" cy="4.2" rx="7" ry="1.8" fill="#2a221c" />
      <rect x="5" y="4" width="14" height="17" rx="2.5" fill="url(#oil-barrel-body)" stroke="#000" strokeWidth="0.5" />
      <rect x="5" y="8.5" width="14" height="1.6" fill="#c97a2e" opacity={0.85} />
      <rect x="5" y="14.5" width="14" height="1.6" fill="#c97a2e" opacity={0.85} />
      <ellipse cx="9.5" cy="12" rx="1.6" ry="4" fill="#fff" opacity={0.06} />
    </svg>
  );
}

interface InstrumentIconProps {
  instrument: Instrument;
  size?: number;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function InstrumentIcon({ instrument, size = 20, className = "" }: InstrumentIconProps) {
  const [imgError, setImgError] = useState(false);
  const { category, symbol } = instrument;

  // ── FOREX: Dua emoji flag overlap (base + quote) ─────────────────────────
  // Emoji Unicode — tidak butuh CDN, tidak ada ESLint warning
  if (category === "forex") {
    const base  = symbol.slice(0, 3).toUpperCase();
    const quote = symbol.slice(3, 6).toUpperCase();
    const baseFlag  = CURRENCY_TO_FLAG[base];
    const quoteFlag = CURRENCY_TO_FLAG[quote];

    if (baseFlag && quoteFlag) {
      const flagSize = Math.round(size * 0.68);
      return (
        <div
          className={className}
          title={instrument.displayName}
          style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
        >
          {/* Flag base — kiri bawah */}
          <span
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              fontSize: flagSize,
              lineHeight: 1,
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
            }}
          >
            {baseFlag}
          </span>
          {/* Flag quote — kanan atas */}
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              fontSize: flagSize,
              lineHeight: 1,
              filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6))",
            }}
          >
            {quoteFlag}
          </span>
        </div>
      );
    }
  }

  // ── CRYPTO: CoinCap CDN ───────────────────────────────────────────────────
  if (category === "crypto" && !imgError) {
    // PENTING: Urutan regex harus dari suffix terpanjang ke terpendek
    // Agar "USDT" di-match sebelum "USD", "BUSD" sebelum "USD", dll.
    const base = symbol.replace(/USDT$|BUSD$|USD$|BTC$/i, "").toLowerCase();
    
    // Gunakan mapping khusus jika ada, jika tidak gunakan base name
    const iconName = CRYPTO_ICON_MAPPING[base] || base;
    
    return (
      <Image
        src={`https://assets.coincap.io/assets/icons/${iconName}@2x.png`}
        width={size}
        height={size}
        alt={symbol}
        title={instrument.displayName}
        className={className}
        unoptimized // external CDN — Next.js tidak bisa optimasi gambar dari domain luar
        style={{ flexShrink: 0, objectFit: "contain", borderRadius: "50%" }}
        onError={() => setImgError(true)}
      />
    );
  }

  // ── STOCKS: Custom Logo (Google Favicon) ─────────────────────────────────────────────
  if (category === "commodities") {
    // COMMODITIES: Custom inline SVG (gold/silver bar, oil barrel)
    const visual = COMMODITY_VISUAL[symbol.toUpperCase()];
    if (visual) {
      const badgeSize = Math.round(size * 0.5);
      return (
        <div
          className={className}
          title={instrument.displayName}
          style={{ position: "relative", width: size, height: size, flexShrink: 0 }}
        >
          {visual.kind === "oil"
            ? <OilBarrelIcon size={size} />
            : <BullionBarIcon size={size} metal={visual.kind} />}
          {visual.flag && (
            <span
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                fontSize: badgeSize,
                lineHeight: 1,
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.7))",
              }}
            >
              {visual.flag}
            </span>
          )}
        </div>
      );
    }
  }

  if (category === "stocks" && !imgError) {
    const domain = STOCK_DOMAIN[symbol.toUpperCase()];
    if (domain) {
      return (
        <Image
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          width={size}
          height={size}
          alt={symbol}
          title={instrument.displayName}
          className={className}
          unoptimized // external CDN — Next.js tidak bisa optimasi gambar dari domain luar
          style={{ flexShrink: 0, objectFit: "contain", borderRadius: 4 }}
          onError={() => setImgError(true)}
        />
      );
    }
  }

  // ── FALLBACK: Emoji dari config ───────────────────────────────────────────
  return (
    <span
      className={className}
      title={instrument.displayName}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        fontSize: size * 0.75,
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {instrument.icon || "?"}
    </span>
  );
}