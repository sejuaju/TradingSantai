# 📘 Migrasi ke Saxo Bank OpenAPI

Panduan lengkap untuk menggunakan Saxo Bank OpenAPI sebagai pengganti Binance API.

## 🔑 Keuntungan Saxo Bank API

✅ **Regulated Broker** - Licensed dan regulated di banyak negara  
✅ **Multi-Asset** - Forex, Stocks, Indices, Commodities, Bonds  
✅ **Professional Grade** - Enterprise-level trading infrastructure  
✅ **Real Account Trading** - Bukan hanya crypto, tapi traditional markets  
✅ **Advanced Features** - Options, Futures, Mutual Funds  
✅ **Institutional Quality** - Used by banks dan financial institutions  

## ⚠️ Perbedaan dengan Binance

| Feature | Binance | Saxo Bank |
|---------|---------|-----------|
| **Auth** | No auth (public data) | OAuth 2.0 required |
| **Markets** | Crypto only | Forex, Stocks, CFDs, etc |
| **Data** | Free | Requires account |
| **Volume** | Provided | Not always available |
| **WebSocket** | Simple | SignalR-based streaming |
| **Regulation** | Varies | Strictly regulated |

---

## 🚀 Quick Start

### 1. Register di Saxo Bank

1. Go to https://www.developer.saxo/
2. Create developer account
3. Register your app
4. Get **App Key** and **App Secret**
5. Choose environment:
   - **Simulation** (SIM): For testing (recommended start here)
   - **Live**: For real trading

### 2. Update Configuration

Edit `src/components/terminal/config.ts`:

```typescript
// Add Saxo configuration
export const SAXO_CONFIG = {
  APP_KEY: process.env.NEXT_PUBLIC_SAXO_APP_KEY || "",
  APP_SECRET: process.env.NEXT_PUBLIC_SAXO_APP_SECRET || "",
  ENVIRONMENT: "SIM", // or "LIVE"
  
  // Selected instrument
  DEFAULT_INSTRUMENT: {
    uic: 21,              // EUR/USD
    assetType: "FxSpot",
    symbol: "EURUSD",
  },
};

// Toggle between APIs
export const API_PROVIDER: "BINANCE" | "SAXO" = "BINANCE"; // Change to "SAXO"
```

### 3. Create .env.local

```bash
# .env.local (DO NOT COMMIT!)
NEXT_PUBLIC_SAXO_APP_KEY=your_app_key_here
NEXT_PUBLIC_SAXO_APP_SECRET=your_app_secret_here
```

---

## 🔐 Authentication Flow

Saxo menggunakan OAuth 2.0. Berikut flow-nya:

### Step 1: Redirect ke Saxo Login
```typescript
import { SaxoAPIClient } from "./adapters/saxoAdapter";

const saxoClient = new SaxoAPIClient({
  appKey: SAXO_CONFIG.APP_KEY,
  appSecret: SAXO_CONFIG.APP_SECRET,
});

// Redirect user ke Saxo login
const authUrl = saxoClient.getAuthUrl();
window.location.href = authUrl;
```

### Step 2: Handle Callback
```typescript
// app/callback/page.tsx
export default function CallbackPage() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    
    if (code) {
      saxoClient.getAccessToken(code).then((token) => {
        // Save token (e.g., localStorage, secure cookie)
        localStorage.setItem("saxo_token", token);
        
        // Redirect to terminal
        router.push("/");
      });
    }
  }, []);
  
  return <div>Authenticating...</div>;
}
```

### Step 3: Use Token
```typescript
const token = localStorage.getItem("saxo_token");
const saxoClient = new SaxoAPIClient({
  appKey: SAXO_CONFIG.APP_KEY,
  appSecret: SAXO_CONFIG.APP_SECRET,
  accessToken: token,
});
```

---

## 📊 Fetch Historical Data

```typescript
// Get 100 candles of EUR/USD 15-minute
const candles = await saxoClient.getHistoricalData({
  uic: 21,                    // EUR/USD
  assetType: "FxSpot",
  horizon: 15,                // 15 minutes
  count: 100,
  mode: "From",
});

// candles adalah array of Candle[] (sama format dengan Binance)
```

### Available Horizons
```typescript
1     // 1 minute
5     // 5 minutes
15    // 15 minutes
60    // 1 hour
240   // 4 hours
1440  // 1 day
10080 // 1 week
```

---

## 💰 Get Current Price

```typescript
const priceInfo = await saxoClient.getPriceInfo({
  uic: 21,
  assetType: "FxSpot",
});

console.log(priceInfo);
// {
//   currentPrice: 1.0850,
//   high24h: 1.0875,
//   low24h: 1.0820,
//   bid: 1.0849,
//   ask: 1.0851,
// }
```

---

## 🔄 Real-Time Streaming

```typescript
const ws = await saxoClient.createPriceStream({
  uic: 21,
  assetType: "FxSpot",
  
  onUpdate: (price) => {
    console.log("New price:", price.mid);
    // Update your state here
    setCurrentPrice(price.mid);
  },
  
  onError: (error) => {
    console.error("Stream error:", error);
  },
});

// Cleanup
ws.close();
```

---

## 🎯 Available Instruments

### Forex Majors
```typescript
EURUSD: { uic: 21, assetType: "FxSpot" }
GBPUSD: { uic: 22, assetType: "FxSpot" }
USDJPY: { uic: 23, assetType: "FxSpot" }
AUDUSD: { uic: 28, assetType: "FxSpot" }
```

### Indices CFD
```typescript
SP500:   { uic: 1047, assetType: "CfdOnIndex" }
NASDAQ:  { uic: 1048, assetType: "CfdOnIndex" }
```

### Commodities CFD
```typescript
GOLD: { uic: 73, assetType: "CfdOnCommodity" }
OIL:  { uic: 37, assetType: "CfdOnCommodity" }
```

**Note**: UICs berbeda antara SIM dan LIVE environment!

---

## 🔄 Create useMarketDataSaxo Hook

```typescript
// src/components/terminal/useMarketDataSaxo.ts
import { useState, useEffect } from "react";
import { SaxoAPIClient, SAXO_INSTRUMENTS } from "./adapters/saxoAdapter";

export function useMarketDataSaxo() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    const token = localStorage.getItem("saxo_token");
    if (!token) {
      // Redirect to auth
      return;
    }
    
    const client = new SaxoAPIClient({
      appKey: process.env.NEXT_PUBLIC_SAXO_APP_KEY!,
      appSecret: process.env.NEXT_PUBLIC_SAXO_APP_SECRET!,
      accessToken: token,
    });
    
    // Fetch historical data
    client.getHistoricalData({
      uic: SAXO_INSTRUMENTS.EURUSD.uic,
      assetType: SAXO_INSTRUMENTS.EURUSD.assetType,
      horizon: 15,
      count: 100,
    }).then(setCandles);
    
    // Stream real-time prices
    client.createPriceStream({
      uic: SAXO_INSTRUMENTS.EURUSD.uic,
      assetType: SAXO_INSTRUMENTS.EURUSD.assetType,
      onUpdate: (price) => {
        setCurrentPrice(price.mid);
        setConnected(true);
      },
      onError: () => setConnected(false),
    });
  }, []);
  
  return { candles, currentPrice, connected };
}
```

---

## 🛡️ Security Best Practices

### ⚠️ NEVER expose secrets in frontend!

**DON'T DO THIS:**
```typescript
// ❌ BAD - App Secret in frontend code
const client = new SaxoAPIClient({
  appKey: "abc123",
  appSecret: "secret456", // ← EXPOSED!
});
```

**DO THIS:**
```typescript
// ✅ GOOD - Use backend proxy
// Create API route: app/api/saxo/token/route.ts
export async function POST(request: Request) {
  const { code } = await request.json();
  
  // Exchange code for token on SERVER side
  const response = await fetch("https://sim.logonvalidation.net/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.SAXO_APP_KEY!,
      client_secret: process.env.SAXO_APP_SECRET!, // ← Safe on server
      redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!,
    }),
  });
  
  const data = await response.json();
  return Response.json(data);
}
```

### Environment Variables
```bash
# .env.local (Server-side only)
SAXO_APP_KEY=your_key
SAXO_APP_SECRET=your_secret  # ← Never expose to client

# .env.local (Client-side safe)
NEXT_PUBLIC_SAXO_APP_KEY=your_key
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/callback
```

---

## 📝 Migration Checklist

- [ ] Register Saxo developer account
- [ ] Get App Key & Secret
- [ ] Test with SIM environment first
- [ ] Create .env.local with credentials
- [ ] Implement OAuth flow
- [ ] Create backend proxy for token exchange
- [ ] Update useMarketData to use Saxo adapter
- [ ] Test with different instruments (FX, Stocks, CFDs)
- [ ] Handle token refresh (tokens expire!)
- [ ] Implement error handling for API limits
- [ ] Test WebSocket reconnection
- [ ] Deploy dengan proper secret management
- [ ] Switch to LIVE environment (when ready)

---

## 🔗 Resources

- **Developer Portal**: https://www.developer.saxo/
- **API Reference**: https://www.developer.saxo/openapi/referencedocs
- **Authentication Guide**: https://www.developer.saxo/openapi/learn/oauth-authorization-code-grant
- **Swagger UI**: https://www.developer.saxo/openapi/try
- **Sample Apps**: https://saxobank.github.io/openapi-samples-js/

---

## 💡 Tips

1. **Start with SIM** - Always test di simulation environment dulu
2. **Cache Tokens** - Saxo tokens valid untuk beberapa jam, cache & refresh
3. **Handle Expiry** - Implement token refresh flow
4. **Rate Limits** - Saxo has rate limits, implement throttling
5. **Instrument Search** - Use Saxo's instrument search API untuk find UICs
6. **Multiple Assets** - Leverage Saxo's multi-asset capability!

---

## ⚠️ Known Limitations

- **Volume Data**: Tidak semua instruments punya volume (especially FX)
- **Auth Required**: Tidak ada public data endpoints
- **Rate Limits**: Ada limits untuk API calls
- **Token Expiry**: Tokens expire, butuh refresh mechanism
- **UIC Differences**: UICs berbeda antara SIM vs LIVE

---

## 🎉 Conclusion

Saxo Bank API membuka akses ke:
- **200+ FX pairs**
- **19,000+ stocks**
- **Indices, Commodities, Bonds**
- **Options & Futures**
- **Professional trading tools**

Perfect untuk upgrade dari crypto-only ke full financial markets! 🚀

---

**Questions?** Check Saxo's developer portal atau documentation mereka yang sangat lengkap.
