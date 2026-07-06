/**
 * Trading Terminal Configuration
 * Centralized configuration file untuk menghindari hardcoded values
 */

// ─── API Provider Selection ───────────────────────────────────────────────────
export type APIProvider = "BINANCE" | "SAXO";

export const API_PROVIDER: APIProvider = "BINANCE"; // Change to "SAXO" when ready

// ─── Instrument Categories ────────────────────────────────────────────────────
export type InstrumentCategory = "crypto" | "forex" | "commodities" | "stocks" | "indices";

export interface Instrument {
  id: string;
  symbol: string;
  displayName: string;
  category: InstrumentCategory;
  broker: APIProvider;
  icon?: string;
  description?: string;
  // Binance-specific
  binanceSymbol?: string;
  // Saxo-specific (optional - will be dynamically resolved if not provided)
  uic?: number;
  assetType?: string;
  // Search keywords for dynamic UIC lookup
  searchKeywords?: string;
}

// ─── Available Instruments ────────────────────────────────────────────────────
export const INSTRUMENTS: Record<string, Instrument> = {
  // ══════════════════════════════════════════════════════════════════════════
  // CRYPTO (Binance)
  // ══════════════════════════════════════════════════════════════════════════
  "BTCUSDT": {
    id: "BTCUSDT",
    symbol: "BTCUSDT",
    displayName: "Bitcoin",
    category: "crypto",
    broker: "BINANCE",
    icon: "₿",
    description: "BTC/USDT",
    binanceSymbol: "BTCUSDT",
  },
  "ETHUSDT": {
    id: "ETHUSDT",
    symbol: "ETHUSDT",
    displayName: "Ethereum",
    category: "crypto",
    broker: "BINANCE",
    icon: "Ξ",
    description: "ETH/USDT",
    binanceSymbol: "ETHUSDT",
  },
  "BNBUSDT": {
    id: "BNBUSDT",
    symbol: "BNBUSDT",
    displayName: "Binance Coin",
    category: "crypto",
    broker: "BINANCE",
    icon: "🔶",
    description: "BNB/USDT",
    binanceSymbol: "BNBUSDT",
  },
  "SOLUSDT": {
    id: "SOLUSDT",
    symbol: "SOLUSDT",
    displayName: "Solana",
    category: "crypto",
    broker: "BINANCE",
    icon: "◎",
    description: "SOL/USDT",
    binanceSymbol: "SOLUSDT",
  },
  "ADAUSDT": {
    id: "ADAUSDT",
    symbol: "ADAUSDT",
    displayName: "Cardano",
    category: "crypto",
    broker: "BINANCE",
    icon: "₳",
    description: "ADA/USDT",
    binanceSymbol: "ADAUSDT",
  },
  "XRPUSDT": {
    id: "XRPUSDT",
    symbol: "XRPUSDT",
    displayName: "Ripple",
    category: "crypto",
    broker: "BINANCE",
    icon: "✗",
    description: "XRP/USDT",
    binanceSymbol: "XRPUSDT",
  },
  "DOGEUSDT": {
    id: "DOGEUSDT",
    symbol: "DOGEUSDT",
    displayName: "Dogecoin",
    category: "crypto",
    broker: "BINANCE",
    icon: "Ð",
    description: "DOGE/USDT",
    binanceSymbol: "DOGEUSDT",
  },
  "DOTUSDT": {
    id: "DOTUSDT",
    symbol: "DOTUSDT",
    displayName: "Polkadot",
    category: "crypto",
    broker: "BINANCE",
    icon: "●",
    description: "DOT/USDT",
    binanceSymbol: "DOTUSDT",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FOREX (Saxo Bank) - Major Pairs
  // Dynamic UIC lookup with fallback to hardcoded values
  // ══════════════════════════════════════════════════════════════════════════
  "EURUSD": {
    id: "EURUSD",
    symbol: "EURUSD",
    displayName: "Euro / US Dollar",
    category: "forex",
    broker: "SAXO",
    icon: "€/$",
    description: "EUR/USD",
    uic: 21, // Fallback - will use dynamic lookup first
    assetType: "FxSpot",
    searchKeywords: "EURUSD",
  },
  "GBPUSD": {
    id: "GBPUSD",
    symbol: "GBPUSD",
    displayName: "British Pound / US Dollar",
    category: "forex",
    broker: "SAXO",
    icon: "£/$",
    description: "GBP/USD",
    uic: 22,
    assetType: "FxSpot",
    searchKeywords: "GBPUSD",
  },
  "USDJPY": {
    id: "USDJPY",
    symbol: "USDJPY",
    displayName: "US Dollar / Japanese Yen",
    category: "forex",
    broker: "SAXO",
    icon: "$/¥",
    description: "USD/JPY",
    uic: 23,
    assetType: "FxSpot",
    searchKeywords: "USDJPY",
  },
  "AUDUSD": {
    id: "AUDUSD",
    symbol: "AUDUSD",
    displayName: "Australian Dollar / US Dollar",
    category: "forex",
    broker: "SAXO",
    icon: "A$/$",
    description: "AUD/USD",
    uic: 27,
    assetType: "FxSpot",
    searchKeywords: "AUDUSD",
  },
  "USDCAD": {
    id: "USDCAD",
    symbol: "USDCAD",
    displayName: "US Dollar / Canadian Dollar",
    category: "forex",
    broker: "SAXO",
    icon: "$/C$",
    description: "USD/CAD",
    uic: 24,
    assetType: "FxSpot",
    searchKeywords: "USDCAD",
  },
  "USDCHF": {
    id: "USDCHF",
    symbol: "USDCHF",
    displayName: "US Dollar / Swiss Franc",
    category: "forex",
    broker: "SAXO",
    icon: "$/₣",
    description: "USD/CHF",
    uic: 25,
    assetType: "FxSpot",
    searchKeywords: "USDCHF",
  },
  "NZDUSD": {
    id: "NZDUSD",
    symbol: "NZDUSD",
    displayName: "New Zealand Dollar / US Dollar",
    category: "forex",
    broker: "SAXO",
    icon: "NZ$/$",
    description: "NZD/USD",
    uic: 28,
    assetType: "FxSpot",
    searchKeywords: "NZDUSD",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // COMMODITIES (Saxo Bank)
  // AssetType: "CfdOnFutures" — satu-satunya AssetType valid di Saxo untuk komoditi spot/rolling
  //   - "CfdOnSpot" TIDAK ADA di Saxo (verif: developer.saxo/openapi/referencedocs)
  //   - "CfdOnCommodity" juga TIDAK ADA
  // searchKeywords: gunakan nama instrumen Saxo, BUKAN simbol forex (XAUUSD, dsb)
  //   - Gold → "Gold", Silver → "Silver", WTI → "OilUSD", Brent → "OilUKGB"
  // UIC adalah fallback — nilai aktual di-resolve via dynamic search
  // ══════════════════════════════════════════════════════════════════════════
  "XAUUSD": {
    id: "XAUUSD",
    symbol: "XAUUSD",
    displayName: "Gold",
    category: "commodities",
    broker: "SAXO",
    icon: "🥇",
    description: "XAU/USD (Gold)",
    uic: 1083,              // fallback UIC SIM
    assetType: "CfdOnFutures",
    searchKeywords: "Gold", // Saxo symbol = "Gold", bukan "XAUUSD"
  },
  "XAGUSD": {
    id: "XAGUSD",
    symbol: "XAGUSD",
    displayName: "Silver",
    category: "commodities",
    broker: "SAXO",
    icon: "🥈",
    description: "XAG/USD (Silver)",
    uic: 1084,                 // fallback UIC SIM
    assetType: "CfdOnFutures",
    searchKeywords: "Silver",  // Saxo symbol = "Silver"
  },
  "XTIUSD": {
    id: "XTIUSD",
    symbol: "XTIUSD",
    displayName: "Crude Oil (WTI)",
    category: "commodities",
    broker: "SAXO",
    icon: "🛢️",
    description: "WTI Crude Oil",
    uic: 1081,                  // fallback UIC SIM
    assetType: "CfdOnFutures",
    searchKeywords: "OilUSD",   // Saxo keyword untuk WTI Oil
  },
  "XBRUSD": {
    id: "XBRUSD",
    symbol: "XBRUSD",
    displayName: "Crude Oil (Brent)",
    category: "commodities",
    broker: "SAXO",
    icon: "🛢️",
    description: "Brent Crude Oil",
    uic: 1082,                   // fallback UIC SIM
    assetType: "CfdOnFutures",
    searchKeywords: "OilUKGB",   // Saxo keyword untuk Brent Oil
  },

  // ══════════════════════════════════════════════════════════════════════════
  // STOCKS (Saxo Bank) - US Tech Giants
  // ══════════════════════════════════════════════════════════════════════════
  "AAPL": {
    id: "AAPL",
    symbol: "AAPL",
    displayName: "Apple Inc.",
    category: "stocks",
    broker: "SAXO",
    icon: "",
    description: "AAPL",
    uic: 211,
    assetType: "Stock",
    searchKeywords: "AAPL",
  },
  "MSFT": {
    id: "MSFT",
    symbol: "MSFT",
    displayName: "Microsoft Corp.",
    category: "stocks",
    broker: "SAXO",
    icon: "🪟",
    description: "MSFT",
    uic: 214,
    assetType: "Stock",
    searchKeywords: "MSFT",
  },
  "GOOGL": {
    id: "GOOGL",
    symbol: "GOOGL",
    displayName: "Alphabet Inc.",
    category: "stocks",
    broker: "SAXO",
    icon: "🔍",
    description: "GOOGL",
    uic: 212,
    assetType: "Stock",
    searchKeywords: "GOOGL",
  },
  "AMZN": {
    id: "AMZN",
    symbol: "AMZN",
    displayName: "Amazon.com Inc.",
    category: "stocks",
    broker: "SAXO",
    icon: "📦",
    description: "AMZN",
    uic: 213,
    assetType: "Stock",
    searchKeywords: "AMZN",
  },
  "TSLA": {
    id: "TSLA",
    symbol: "TSLA",
    displayName: "Tesla Inc.",
    category: "stocks",
    broker: "SAXO",
    icon: "⚡",
    description: "TSLA",
    uic: 215,
    assetType: "Stock",
    searchKeywords: "TSLA",
  },
  "NVDA": {
    id: "NVDA",
    symbol: "NVDA",
    displayName: "NVIDIA Corp.",
    category: "stocks",
    broker: "SAXO",
    icon: "🎮",
    description: "NVDA",
    uic: 216,
    assetType: "Stock",
    searchKeywords: "NVDA",
  },
  "META": {
    id: "META",
    symbol: "META",
    displayName: "Meta Platforms Inc.",
    category: "stocks",
    broker: "SAXO",
    icon: "👥",
    description: "META",
    uic: 217,
    assetType: "Stock",
    searchKeywords: "META",
  },

  // ══════════════════════════════════════════════════════════════════════════
  // INDICES (Saxo Bank)
  // UIC adalah fallback — nilai aktual akan di-resolve via dynamic search
  // ══════════════════════════════════════════════════════════════════════════
  "US500": {
    id: "US500",
    symbol: "US500",
    displayName: "S&P 500",
    category: "indices",
    broker: "SAXO",
    icon: "📊",
    description: "S&P 500 Index",
    uic: 1047,                  // fallback UIC (SIM)
    assetType: "CfdOnIndex",
    searchKeywords: "S&P 500",
  },
  "US30": {
    id: "US30",
    symbol: "US30",
    displayName: "Dow Jones",
    category: "indices",
    broker: "SAXO",
    icon: "📈",
    description: "Dow Jones Industrial Average",
    uic: 1046,                  // fallback UIC (SIM)
    assetType: "CfdOnIndex",
    searchKeywords: "Dow Jones",
  },
  "NAS100": {
    id: "NAS100",
    symbol: "NAS100",
    displayName: "NASDAQ 100",
    category: "indices",
    broker: "SAXO",
    icon: "💻",
    description: "NASDAQ 100 Index",
    uic: 1048,                  // fallback UIC (SIM)
    assetType: "CfdOnIndex",
    searchKeywords: "NASDAQ 100",
  },
};

// ─── Default Instrument ───────────────────────────────────────────────────────
export const DEFAULT_INSTRUMENT_ID = "XAUUSD";

// ─── Helper: Get instruments by category ──────────────────────────────────────
export function getInstrumentsByCategory(category: InstrumentCategory): Instrument[] {
  return Object.values(INSTRUMENTS).filter(i => i.category === category);
}

// ─── Helper: Get instruments by broker ────────────────────────────────────────
export function getInstrumentsByBroker(broker: APIProvider): Instrument[] {
  return Object.values(INSTRUMENTS).filter(i => i.broker === broker);
}

/** Ukuran 1 pip per kategori — untuk kalkulasi lot/pip di sidebar */
export const PIP_SIZE_BY_CATEGORY: Record<InstrumentCategory, number> = {
  crypto: 1,
  forex: 0.0001,
  commodities: 0.01,
  stocks: 0.01,
  indices: 1,
};

// ─── Category Labels ──────────────────────────────────────────────────────────
export const CATEGORY_LABELS: Record<InstrumentCategory, string> = {
  crypto: "Cryptocurrency",
  forex: "Forex",
  commodities: "Commodities",
  stocks: "Stocks",
  indices: "Indices",
};

// ─── Binance API Configuration ────────────────────────────────────────────────
export const BINANCE_CONFIG = {
  REST_API: "https://api.binance.com/api/v3",
  WS_API: "wss://stream.binance.com:9443/ws",
  SYMBOL: "BTCUSDT",
  RECONNECT_DELAY_MS: 3000,
} as const;

// ─── Saxo Bank API Configuration ──────────────────────────────────────────────
// Baca environment sekali, dipakai di seluruh SAXO_CONFIG
const _SAXO_ENV = (process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT || "SIM") as "SIM" | "LIVE";
const _SAXO_IS_LIVE = _SAXO_ENV === "LIVE";

export const SAXO_CONFIG = {
  // Get from https://www.developer.saxo/
  APP_KEY: process.env.NEXT_PUBLIC_SAXO_APP_KEY || "",
  // APP_SECRET tidak boleh NEXT_PUBLIC_ — hanya diakses server-side via /api/saxo/token

  // Environment: "SIM" untuk testing, "LIVE" untuk production
  ENVIRONMENT: _SAXO_ENV,

  // API Endpoints — otomatis sesuai environment dari .env.local
  AUTH_URL: _SAXO_IS_LIVE
    ? "https://live.logonvalidation.net"
    : "https://sim.logonvalidation.net",
  API_URL: _SAXO_IS_LIVE
    ? "https://gateway.saxobank.com/openapi"
    : "https://gateway.saxobank.com/sim/openapi",
  STREAM_URL: _SAXO_IS_LIVE
    ? "wss://streaming.saxobank.com/openapi"
    : "wss://streaming.saxobank.com/sim/openapi",

  // Default instrument (EUR/USD for FX)
  DEFAULT_INSTRUMENT: {
    uic: 21,
    assetType: "FxSpot",
    symbol: "EURUSD",
  },

  // Redirect URI — baca dari env var, fallback ke window.location
  REDIRECT_URI: typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : (process.env.NEXT_PUBLIC_SAXO_REDIRECT_URI || "http://localhost:3001/auth/callback"),

  // Alias untuk backward-compatibility
  REST_API: _SAXO_IS_LIVE
    ? "https://gateway.saxobank.com/openapi"
    : "https://gateway.saxobank.com/sim/openapi",
  WS_API: _SAXO_IS_LIVE
    ? "wss://streaming.saxobank.com/openapi"
    : "wss://streaming.saxobank.com/sim/openapi",
  SYMBOL: "EURUSD",
  RECONNECT_DELAY_MS: 3000,
};

// ─── Active API Config (switches based on API_PROVIDER) ──────────────────────
export const API_CONFIG = API_PROVIDER === "BINANCE"
  ? BINANCE_CONFIG
  : SAXO_CONFIG;

// ─── Trading Parameters ───────────────────────────────────────────────────────
export const TRADING_CONFIG = {
  INITIAL_CAPITAL: 20,        // Modal awal (USD)
  LOT_UNIT: 0.001,           // Unit lot untuk perhitungan size
  MIN_CANDLES: 200,          // = EMA_LONG — skor & sinyal butuh EMA 200 valid
  MAX_SIGNALS_HISTORY: 20,   // Maximum signals dalam history
  CANDLE_DISPLAY_COUNT: 80,  // Jumlah candles di chart
  MAX_CANDLES_BUFFER: 300,   // Minimum ~EMA_LONG+margin untuk EMA 200 akurat
} as const;

// ─── Indicator Parameters ─────────────────────────────────────────────────────
export const INDICATOR_CONFIG = {
  EMA_SHORT: 50,
  EMA_LONG: 200,
  RSI_PERIOD: 14,
  MACD_FAST: 12,
  MACD_SLOW: 26,
  MACD_SIGNAL: 9,
  ATR_PERIOD: 14,
  VOLUME_MA_PERIOD: 20,
  VOLUME_THRESHOLD: 1.2,     // Volume harus 1.2× average untuk konfirmasi
  SWING_LOOKBACK: 80,        // Candles untuk swing high/low detection
} as const;

// ─── Signal Detection Thresholds ──────────────────────────────────────────────
export const SIGNAL_CONFIG = {
  // Base thresholds berdasarkan timeframe
  BASE_THRESHOLD: {
    "1m": 2.0,
    "5m": 2.5,
    "15m": 3.0,
    "1H": 3.0,
    "4H": 3.5,
    "1D": 4.0,
    "1W": 4.0,
  } as Record<string, number>,

  // Cooldown multipliers berdasarkan timeframe
  COOLDOWN_MULTIPLIER: {
    SHORT: 2,  // untuk TF ≤ 1m
    MEDIUM: 3, // untuk TF ≤ 5m
    LONG: 5,   // untuk TF > 5m
  },

  MIN_COOLDOWN_MS: {
    SHORT: 90_000,   // 1.5 menit minimum
    MEDIUM: 180_000, // 3 menit minimum
  },

  // Price separation untuk mencegah re-entry
  PRICE_SEPARATION_ATR_MULTIPLIER: 0.3,

  // Extra score untuk consecutive signals
  STREAK_PENALTY_PER_SIGNAL: 0.8,
  MAX_STREAK_PENALTY: 3,

  // Risk/Reward parameters
  SL_MULTIPLIER: 1.5,  // SL = ATR × 1.5
  TP_MULTIPLIER: 3.0,  // TP = ATR × 3.0

  // Support/Resistance proximity (dalam ATR)
  SR_PROXIMITY_ATR: 0.8,

  // Gate sinyal — skor harus unggul & RSI tidak ekstrem
  SIGNAL_EDGE: 0.5,
  RSI_BUY_MAX: 78,
  RSI_SELL_MIN: 22,
} as const;

// ─── Score Weights ────────────────────────────────────────────────────────────
export const SCORE_WEIGHTS = {
  EMA_CROSS: 2.0,
  EMA_TREND: 1.0,
  PRICE_VS_EMA: 1.0,
  MACD: 1.0,
  MACD_WEAK: 0.5,
  RSI_STRONG: 2.0,      // RSI < 30 atau > 70
  RSI_MODERATE: 1.0,    // RSI < 40 atau > 60
  VOLUME: 1.0,
  PATTERN: 2.0,
  PATTERN_WEAK: 0.5,
  HTF_TREND: 1.5,
  KEY_LEVEL: 1.0,
} as const;

// ─── RSI Thresholds ───────────────────────────────────────────────────────────
export const RSI_CONFIG = {
  OVERSOLD_STRONG: 30,
  OVERSOLD_MODERATE: 40,
  OVERBOUGHT_STRONG: 70,
  OVERBOUGHT_MODERATE: 60,
} as const;

/** Maksimum skor per sisi — jumlah bobot semua faktor */
export const MAX_SCORE =
  SCORE_WEIGHTS.EMA_CROSS +
  SCORE_WEIGHTS.EMA_TREND +
  SCORE_WEIGHTS.PRICE_VS_EMA +
  SCORE_WEIGHTS.MACD +
  SCORE_WEIGHTS.RSI_STRONG +
  SCORE_WEIGHTS.VOLUME +
  SCORE_WEIGHTS.PATTERN +
  SCORE_WEIGHTS.HTF_TREND +
  SCORE_WEIGHTS.KEY_LEVEL;

/** Klasifikasi kekuatan skor (dalam poin mentah, bukan %) */
export const STRENGTH_CONFIG = {
  STRONG_MIN: 6,
  MODERATE_MIN: 3,
} as const;

/** Map durasi candle (ms) → key timeframe untuk BASE_THRESHOLD */
export function candleDurationToTfKey(durationMs: number): TimeframeKey {
  if (durationMs <= 60_000) return "1m";
  if (durationMs <= 300_000) return "5m";
  if (durationMs <= 900_000) return "15m";
  if (durationMs <= 3_600_000) return "1H";
  if (durationMs <= 14_400_000) return "4H";
  if (durationMs <= 86_400_000) return "1D";
  return "1W";
}

export function getSignalCooldownMs(candleDurationMs: number): number {
  const { COOLDOWN_MULTIPLIER, MIN_COOLDOWN_MS } = SIGNAL_CONFIG;
  if (candleDurationMs <= 60_000) {
    return Math.max(candleDurationMs * COOLDOWN_MULTIPLIER.SHORT, MIN_COOLDOWN_MS.SHORT);
  }
  if (candleDurationMs <= 300_000) {
    return Math.max(candleDurationMs * COOLDOWN_MULTIPLIER.MEDIUM, MIN_COOLDOWN_MS.MEDIUM);
  }
  return Math.max(candleDurationMs * COOLDOWN_MULTIPLIER.LONG, MIN_COOLDOWN_MS.MEDIUM);
}

export function getScoreColor(pct: number): string {
  if (pct >= TIER_CONFIG.T1_THRESHOLD) return "#22c55e";
  if (pct >= TIER_CONFIG.T2_THRESHOLD) return "#00d4e8";
  if (pct >= TIER_CONFIG.T3_THRESHOLD) return "#f97316";
  if (pct >= TIER_CONFIG.T4_THRESHOLD) return "#f59e0b";
  return "#ef4444";
}

export function getScoreTier(pct: number): {
  tier: string; label: string; stars: number; color: string;
} {
  if (pct >= TIER_CONFIG.T1_THRESHOLD) {
    return { tier: "T1", label: "STRONG", stars: 5, color: "#22c55e" };
  }
  if (pct >= TIER_CONFIG.T2_THRESHOLD) {
    return { tier: "T2", label: "CONFIRM", stars: 4, color: "#00d4e8" };
  }
  if (pct >= TIER_CONFIG.T3_THRESHOLD) {
    return { tier: "T3", label: "WATCH", stars: 3, color: "#f97316" };
  }
  if (pct >= TIER_CONFIG.T4_THRESHOLD) {
    return { tier: "T4", label: "WEAK", stars: 2, color: "#f59e0b" };
  }
  return { tier: "T5", label: "AVOID", stars: 1, color: "#ef4444" };
}

// ─── Chart Display Settings ───────────────────────────────────────────────────
export const CHART_CONFIG = {
  CANDLE_WIDTH: 8,
  CANDLE_GAP: 2,
  CANDLE_BODY_WIDTH_RATIO: 0.6,
  VOLUME_HEIGHT_RATIO: 0.15,  // Volume chart 15% dari total height
  MA_PERIOD: 7,
  PRICE_LABEL_DECIMALS: 2,
} as const;

// ─── UI Tier System ───────────────────────────────────────────────────────────
export const TIER_CONFIG = {
  T1_THRESHOLD: 80,  // ≥ 80% dari max score
  T2_THRESHOLD: 70,
  T3_THRESHOLD: 50,
  T4_THRESHOLD: 30,
  // T5 = < 30%
} as const;

// ─── Update Intervals ─────────────────────────────────────────────────────────
export const UPDATE_INTERVALS = {
  TICKER_24H_MS: 30_000,      // Update ticker setiap 30 detik
  HTF_TREND_MS: 60_000,       // Update HTF trend setiap 1 menit
  DEBUG_THROTTLE_MS: 5_000,   // Throttle debug logs setiap 5 detik
} as const;

// ─── Type Exports ─────────────────────────────────────────────────────────────
export type TimeframeKey = "1m" | "5m" | "15m" | "1H" | "4H" | "1D" | "1W";