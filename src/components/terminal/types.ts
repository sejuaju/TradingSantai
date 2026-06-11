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
  closePrice?: number;
  closeTime?: number;
}
