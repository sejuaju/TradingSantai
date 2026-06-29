import type { Metadata } from "next";
import StrategyLabPage from "@/components/strategy-lab/StrategyLabPage";

export const metadata: Metadata = {
  title: "Strategy Lab — Trading Santai",
  description:
    "Tulis strategi TS-MQL5, jalankan backtest di web, dan export EA .mq5 untuk MetaTrader 5.",
};

export default function Page() {
  return <StrategyLabPage />;
}