export const TF_MAP: Record<string, { wsInterval: string; apiInterval: string }> = {
  "1m":  { wsInterval: "1m",  apiInterval: "1m"  },
  "5m":  { wsInterval: "5m",  apiInterval: "5m"  },
  "15m": { wsInterval: "15m", apiInterval: "15m" },
  "1H":  { wsInterval: "1h",  apiInterval: "1h"  },
  "4H":  { wsInterval: "4h",  apiInterval: "4h"  },
  "1D":  { wsInterval: "1d",  apiInterval: "1d"  },
  "1W":  { wsInterval: "1w",  apiInterval: "1w"  },
};

// Higher timeframe untuk trend confirmation (Multi-TF Analysis)
export const HTF_MAP: Record<string, string> = {
  "1m":  "15m",
  "5m":  "1h",
  "15m": "4h",
  "1H":  "1d",
  "4H":  "1d",
  "1D":  "1w",
  "1W":  "1w",
};

/** Higher timeframe keys for Saxo chart API (matches SAXO_HORIZONS casing) */
export const HTF_SAXO_TF: Record<string, string> = {
  "1m":  "15m",
  "5m":  "1H",
  "15m": "4H",
  "1H":  "1D",
  "4H":  "1D",
  "1D":  "1W",
  "1W":  "1W",
};

export const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];
