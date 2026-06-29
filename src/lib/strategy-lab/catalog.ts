import type { CatalogStrategy } from "./types";

export const DEFAULT_STRATEGY_SOURCE = `// Trading Santai — TS-MQL5 v1
input int    RSI_Period = 14;
input int    MA_Period  = 21;
input double SL_ATR     = 1.5;
input double TP_ATR     = 3.0;

void OnTick()
{
   double rsi = iRSI(RSI_Period);
   double ma  = iMA(MA_Period);
   double atr = iATR(14);

   if (rsi < 30 && Close > ma) {
      SignalBuy(SL_ATR * atr, TP_ATR * atr);
   }
   if (rsi > 70 && Close < ma) {
      SignalSell(SL_ATR * atr, TP_ATR * atr);
   }
}
`;

export const STRATEGY_CATALOG: CatalogStrategy[] = [
  {
    id: "rsi-ma-starter",
    name: "RSI + MA Starter",
    description: "Strategi gratis untuk belajar TS-MQL5. RSI oversold/overbought dengan filter EMA.",
    tier: "free",
    rating: 4.6,
    source: DEFAULT_STRATEGY_SOURCE,
    priceLabel: "Gratis",
  },
  {
    id: "ts-smc-pro",
    name: "TS SMC Pro v2",
    description:
      "SNR + Liquidity + MSS + FVG/IFVG — engine port dari TS_SMC_EA v1.50. Trial backtest tanpa source.",
    tier: "premium",
    rating: 4.9,
    source: `// TS SMC Pro v2 — Engine: TS_SMC_EA v1.50 (referensi contohfile/)
// Source .mq5 terkunci. Backtest trial memakai engine lengkap:
//   H1 Bias → Sweep → Displacement → MSS → FVG/IFVG return → Entry
//
// Unlock untuk melihat parameter + export file .mq5 asli ke MT5.`,
    builtinRunner: "ts-smc-trial",
    priceLabel: "Rp 299.000",
  },
];

export const UNLOCK_STORAGE_KEY = "ts-strategy-unlock-ts-smc-pro";

export function isStrategyUnlocked(id: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(UNLOCK_STORAGE_KEY) === "1" && id === "ts-smc-pro";
}

export function unlockStrategyDemo(id: string) {
  if (id === "ts-smc-pro") {
    localStorage.setItem(UNLOCK_STORAGE_KEY, "1");
  }
}

/** Parameter & alur strategi — mirror referensi TS_SMC_EA v1.50.mq5 */
export const TS_SMC_UNLOCKED_SOURCE = `// TS SMC Pro v2 — Trading Santai
// Referensi: contohfile/TS_SMC_EA v2mq5.mq5 (v1.50)
// Backtest web = engine port 1:1 state machine (bukan simplifikasi)
//
// ALUR:
//   H1 Bias (Premium/Discount) → Sweep liquidity (M5)
//   → Displacement (body > ATR×1.8) → MSS
//   → Deteksi FVG / IFVG dari displacement
//   → Entry saat harga RETURN ke zona FVG/IFVG
//
// ─── H1 Bias ───
input int    InpH1SwingLen    = 20;
input double InpPDZoneRatio   = 0.30;
//
// ─── Trigger M5 ───
input int    InpSwingLenTrig  = 10;
input double InpDisplFactor   = 1.8;
input int    InpSweepLookback = 30;
input double InpEqualHLPips   = 5.0;
//
// ─── FVG / IFVG Entry ───
input double InpFVGEntryBuffer = 2.0;
input bool   InpAllowIFVG      = true;
input int    InpFVGTimeout     = 30;
input bool   InpFVGMustHold    = true;
//
// ─── Risk ───
input double InpRRRatio        = 2.0;
input double InpSLBufferPips   = 3.0;
input int    InpMaxTrades      = 1;
//
// ─── Session (UTC) ───
input bool   InpUseSession   = true;
input int    InpSessionStart = 8;
input int    InpSessionEnd   = 20;
//
// Export .mq5 → file EA lengkap (~1093 baris) untuk MetaEditor MT5
// Jalankan backtest via tombol Run (engine TS SMC v1.50)

void OnTick()
{
   // Dieksekusi oleh Strategy Lab SMC Engine (port dari .mq5 referensi)
   // Bukan sandbox TS-MQL5 sederhana — logika multi-step di engine.ts
}
`;

export const REFERENCE_MQ5_URL = "/strategy-lab/TS_SMC_EA_v2.mq5";
export const REFERENCE_MQ5_FILENAME = "TS_SMC_EA_v2.mq5";