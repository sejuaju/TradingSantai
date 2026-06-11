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

  // ── STOCKS: Clearbit Logo API ─────────────────────────────────────────────
  if (category === "stocks" && !imgError) {
    const domain = STOCK_DOMAIN[symbol.toUpperCase()];
    if (domain) {
      return (
        <Image
          src={`https://logo.clearbit.com/${domain}`}
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