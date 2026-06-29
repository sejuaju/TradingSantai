import type { Instrument, InstrumentCategory } from "./config";

interface PriceFormat {
  prefix: string;
  minDecimals: number;
  maxDecimals: number;
}

function getFormat(instrument?: Instrument | null): PriceFormat {
  const category: InstrumentCategory = instrument?.category ?? "crypto";
  const symbol = instrument?.symbol ?? "";

  switch (category) {
    case "forex":
      return symbol.includes("JPY")
        ? { prefix: "¥", minDecimals: 2, maxDecimals: 3 }
        : { prefix: "", minDecimals: 4, maxDecimals: 5 };
    case "commodities":
      return { prefix: "$", minDecimals: 2, maxDecimals: 2 };
    case "stocks":
    case "indices":
      return { prefix: "$", minDecimals: 2, maxDecimals: 2 };
    case "crypto":
    default:
      return { prefix: "$", minDecimals: 2, maxDecimals: 2 };
  }
}

export function formatInstrumentPrice(
  price: number,
  instrument?: Instrument | null
): string {
  if (price <= 0) return "—";
  const { prefix, minDecimals, maxDecimals } = getFormat(instrument);
  const formatted = price.toLocaleString("en-US", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
  return prefix ? `${prefix}${formatted}` : formatted;
}

export function createPriceFormatter(instrument?: Instrument | null) {
  return (price: number) => formatInstrumentPrice(price, instrument);
}