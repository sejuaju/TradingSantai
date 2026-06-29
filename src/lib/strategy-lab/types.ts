import type { Candle, Signal } from "@/components/terminal/types";

export interface StrategyInput {
  name: string;
  type: "int" | "double";
  value: number;
}

export interface ParseResult {
  ok: boolean;
  inputs: StrategyInput[];
  onTickBody: string;
  errors: string[];
  warnings: string[];
}

export interface BacktestTrade {
  type: "BUY" | "SELL";
  entryPrice: number;
  sl: number;
  tp: number;
  entryTime: number;
  exitPrice: number;
  exitTime: number;
  result: "win" | "loss";
  pnl: number;
}

export interface BacktestResult {
  ok: boolean;
  error?: string;
  engine?: string;
  signals: Signal[];
  trades: BacktestTrade[];
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  netPnl: number;
  maxDrawdown: number;
}

export interface CatalogStrategy {
  id: string;
  name: string;
  description: string;
  tier: "free" | "premium";
  rating: number;
  /** Full source — empty when premium locked */
  source: string;
  /** Hidden runner for premium trial (no source leak) */
  builtinRunner?: "ts-smc-trial";
  priceLabel: string;
}

export interface ExportOptions {
  strategyName: string;
  author?: string;
  licensedTo?: string;
}

export type BarContext = {
  bar: number;
  close: number;
  open: number;
  high: number;
  low: number;
  time: number;
  iRSI: (period: number) => number;
  iMA: (period: number) => number;
  iEMA: (period: number) => number;
  iATR: (period: number) => number;
  signalBuy: (slDist: number, tpDist: number) => void;
  signalSell: (slDist: number, tpDist: number) => void;
};

export type OnTickFn = (
  ctx: BarContext,
  inputs: Record<string, number>,
) => void;