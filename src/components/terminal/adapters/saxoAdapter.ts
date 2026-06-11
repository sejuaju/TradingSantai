/**
 * Saxo Bank OpenAPI Adapter
 * Documentation: https://www.developer.saxo/openapi/learn
 */

import { Candle } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SaxoConfig {
  appKey: string;           // Your Saxo App Key
  appSecret: string;        // Your Saxo App Secret
  authUrl: string;          // Authentication endpoint
  apiUrl: string;           // Trading API endpoint
  streamUrl: string;        // Streaming/WebSocket endpoint
  accountKey?: string;      // User account key (after auth)
  accessToken?: string;     // OAuth token (after auth)
}

export interface SaxoOHLCData {
  Data: Array<{
    CloseAsk: number;
    CloseBid: number;
    HighAsk: number;
    HighBid: number;
    LowAsk: number;
    LowBid: number;
    OpenAsk: number;
    OpenBid: number;
    Time: string;           // ISO 8601 format
  }>;
  DataVersion: number;
}

export interface Saxo24hData {
  Quote: {
    Amount: number;
    Ask: number;
    Bid: number;
    Mid: number;
    PriceTypeAsk: string;
    PriceTypeBid: string;
  };
  PriceInfo: {
    High: number;
    Low: number;
  };
}

// ─── Saxo OpenAPI Client ──────────────────────────────────────────────────────
export class SaxoAPIClient {
  private config: SaxoConfig;
  private baseHeaders: HeadersInit;

  constructor(config: SaxoConfig) {
    this.config = {
      // Defaults (can be overridden by config)
      authUrl: config.authUrl || "https://sim.logonvalidation.net",  // Simulation
      apiUrl: config.apiUrl || "https://gateway.saxobank.com/sim/openapi",  // Simulation
      streamUrl: config.streamUrl || "wss://streaming.saxobank.com/sim/openapi",
      appKey: config.appKey,
      appSecret: config.appSecret,
      accountKey: config.accountKey,
      accessToken: config.accessToken,
    };

    this.baseHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.config.accessToken || ""}`,
    };
  }

  /**
   * Step 1: OAuth Authentication Flow
   * User needs to authenticate via Saxo's OAuth
   * Returns authorization code that you exchange for access token
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.appKey,
      redirect_uri: window.location.origin + "/auth/callback",
      state: Math.random().toString(36).substring(7),
    });
    
    return `${this.config.authUrl}/authorize?${params}`;
  }

  /**
   * Step 2: Exchange authorization code for access token
   */
  async getAccessToken(authCode: string): Promise<string> {
    const response = await fetch(`${this.config.authUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: authCode,
        client_id: this.config.appKey,
        client_secret: this.config.appSecret,
        redirect_uri: window.location.origin + "/auth/callback",
      }),
    });

    if (!response.ok) {
      throw new Error(`Auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.config.accessToken = data.access_token;
    this.baseHeaders = {
      ...this.baseHeaders,
      "Authorization": `Bearer ${data.access_token}`,
    };

    return data.access_token;
  }

  /**
   * Get historical OHLC data (candles)
   * Instrument: Uic (Unique Instrument Code), e.g., 21 for EUR/USD
   */
  async getHistoricalData(params: {
    uic: number;              // Instrument code
    assetType: string;        // "FxSpot" | "Stock" | "CfdOnIndex" etc
    horizon: number;          // Candle interval in minutes (1, 5, 15, 60, etc)
    count: number;            // Number of candles (max 1200)
    mode?: string;            // "From" | "UpTo" (default: From)
    time?: string;            // ISO timestamp (optional)
  }): Promise<Candle[]> {
    const queryParams = new URLSearchParams({
      Uic: params.uic.toString(),
      AssetType: params.assetType,
      Horizon: params.horizon.toString(),
      Count: params.count.toString(),
      Mode: params.mode || "From",
      FieldGroups: "Data",
    });

    if (params.time) {
      queryParams.append("Time", params.time);
    }

    const url = `${this.config.apiUrl}/chart/v1/charts?${queryParams}`;
    
    const response = await fetch(url, {
      headers: this.baseHeaders,
    });

    if (!response.ok) {
      throw new Error(`Saxo API error: ${response.status}`);
    }

    const data: SaxoOHLCData = await response.json();

    // Convert Saxo format to our Candle format
    return data.Data.map((item) => ({
      time: new Date(item.Time).getTime(),
      open: (item.OpenBid + item.OpenAsk) / 2,
      high: (item.HighBid + item.HighAsk) / 2,
      low: (item.LowBid + item.LowAsk) / 2,
      close: (item.CloseBid + item.CloseAsk) / 2,
      volume: 0, // Saxo doesn't provide volume in OHLC for FX
    }));
  }

  /**
   * Get current price info (similar to 24h ticker)
   */
  async getPriceInfo(params: {
    uic: number;
    assetType: string;
  }): Promise<{
    currentPrice: number;
    high24h: number;
    low24h: number;
    bid: number;
    ask: number;
  }> {
    const url = `${this.config.apiUrl}/trade/v1/infoprices?Uic=${params.uic}&AssetType=${params.assetType}&FieldGroups=Quote,PriceInfo`;
    
    const response = await fetch(url, {
      headers: this.baseHeaders,
    });

    if (!response.ok) {
      throw new Error(`Saxo API error: ${response.status}`);
    }

    const data: Saxo24hData = await response.json();

    return {
      currentPrice: data.Quote.Mid,
      high24h: data.PriceInfo.High,
      low24h: data.PriceInfo.Low,
      bid: data.Quote.Bid,
      ask: data.Quote.Ask,
    };
  }

  /**
   * WebSocket Streaming for real-time prices
   * Saxo uses SignalR-like streaming
   */
  async createPriceStream(params: {
    uic: number;
    assetType: string;
    onUpdate: (price: { bid: number; ask: number; mid: number }) => void;
    onError?: (error: Error) => void;
  }): Promise<WebSocket> {
    // Create subscription
    const subscriptionBody = {
      ContextId: `price_${params.uic}_${Date.now()}`,
      ReferenceId: `ref_${params.uic}`,
      Arguments: {
        Uic: params.uic,
        AssetType: params.assetType,
        FieldGroups: ["Quote"],
      },
    };

    const response = await fetch(
      `${this.config.apiUrl}/trade/v1/infoprices/subscriptions`,
      {
        method: "POST",
        headers: this.baseHeaders,
        body: JSON.stringify(subscriptionBody),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to create subscription: ${response.status}`);
    }

    const subscription = await response.json();

    // Connect to WebSocket
    const ws = new WebSocket(
      `${this.config.streamUrl}/streaming/connection?contextId=${subscription.ContextId}&authorization=${encodeURIComponent(this.config.accessToken || "")}`
    );

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.Quote) {
          params.onUpdate({
            bid: data.Quote.Bid,
            ask: data.Quote.Ask,
            mid: data.Quote.Mid,
          });
        }
      } catch (error) {
        params.onError?.(error as Error);
      }
    };

    ws.onerror = () => {
      params.onError?.(new Error("WebSocket error"));
    };

    return ws;
  }
}

// ─── Instrument Mapping ───────────────────────────────────────────────────────
/**
 * Common instruments UICs (Simulation environment)
 * For production, use Saxo's instrument search API
 */
export const SAXO_INSTRUMENTS = {
  // FX Majors
  EURUSD: { uic: 21, assetType: "FxSpot", symbol: "EUR/USD" },
  GBPUSD: { uic: 22, assetType: "FxSpot", symbol: "GBP/USD" },
  USDJPY: { uic: 23, assetType: "FxSpot", symbol: "USD/JPY" },
  AUDUSD: { uic: 28, assetType: "FxSpot", symbol: "AUD/USD" },
  
  // Indices CFD
  SP500: { uic: 1047, assetType: "CfdOnIndex", symbol: "S&P 500" },
  NASDAQ: { uic: 1048, assetType: "CfdOnIndex", symbol: "NASDAQ" },
  
  // Commodities CFD
  GOLD: { uic: 73, assetType: "CfdOnCommodity", symbol: "Gold" },
  OIL: { uic: 37, assetType: "CfdOnCommodity", symbol: "Crude Oil" },
};

// ─── Horizon Mapping ──────────────────────────────────────────────────────────
/**
 * Map timeframe strings to Saxo horizon values (in minutes)
 */
export const SAXO_HORIZONS: Record<string, number> = {
  "1m": 1,
  "5m": 5,
  "15m": 15,
  "1H": 60,
  "4H": 240,
  "1D": 1440,
  "1W": 10080,
};
