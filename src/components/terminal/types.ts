export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

export interface Signal {
  type: "BUY" | "SELL";
  price: number;
  sl: number;
  tp: number;
  rsi: number;
  reason: string;
  time: number;
  status: "active" | "win" | "loss";
  /** Instrument saat sinyal dibuat — mencegah posisi BTC muncul di chart Gold */
  instrumentId?: string;
  /** Owner platform — posisi hanya milik user ini */
  userId?: string;
  /** Timeframe chart saat entry dibuat (mis. 1m, 5m) */
  entryTimeframe?: string;
  closePrice?: number;
  closeTime?: number;
}
