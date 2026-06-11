# 🚀 Saxo Bank API - Quick Start (5 Minutes)

## ⚡ Super Quick Setup

### 1. Get Credentials (2-3 days wait)
```
1. Go to https://www.developer.saxo/
2. Create account
3. Create app
4. Copy App Key & Secret
```

### 2. Add to .env.local
```bash
NEXT_PUBLIC_SAXO_APP_KEY=your_key_here
NEXT_PUBLIC_SAXO_APP_SECRET=your_secret_here
```

### 3. Switch API Provider
```typescript
// src/components/terminal/config.ts
export const API_PROVIDER: APIProvider = "SAXO"; // ← Change this!
```

### 4. Done! 🎉

---

## 🎯 Quick Code Example

```typescript
import { SaxoAPIClient, SAXO_INSTRUMENTS } from "./adapters/saxoAdapter";

// Create client
const client = new SaxoAPIClient({
  appKey: process.env.NEXT_PUBLIC_SAXO_APP_KEY!,
  accessToken: yourToken, // From OAuth flow
});

// Get EUR/USD 15min candles
const candles = await client.getHistoricalData({
  uic: SAXO_INSTRUMENTS.EURUSD.uic,      // 21
  assetType: SAXO_INSTRUMENTS.EURUSD.assetType, // "FxSpot"
  horizon: 15,
  count: 100,
});

// Stream real-time prices
const ws = await client.createPriceStream({
  uic: 21,
  assetType: "FxSpot",
  onUpdate: (price) => console.log(price.mid),
});
```

---

## 🔐 OAuth Flow (Required!)

### Step 1: Login URL
```typescript
const authUrl = client.getAuthUrl();
window.location.href = authUrl; // Redirect to Saxo
```

### Step 2: Callback Handler
```typescript
// app/callback/page.tsx
const code = new URLSearchParams(window.location.search).get("code");
const token = await client.getAccessToken(code);
localStorage.setItem("saxo_token", token);
```

### Step 3: Use Token
```typescript
const token = localStorage.getItem("saxo_token");
const client = new SaxoAPIClient({ 
  appKey: "...", 
  accessToken: token 
});
```

---

## 🎨 Available Instruments

```typescript
// Forex
SAXO_INSTRUMENTS.EURUSD  // { uic: 21, assetType: "FxSpot" }
SAXO_INSTRUMENTS.GBPUSD  // { uic: 22, assetType: "FxSpot" }
SAXO_INSTRUMENTS.USDJPY  // { uic: 23, assetType: "FxSpot" }

// Indices
SAXO_INSTRUMENTS.SP500   // { uic: 1047, assetType: "CfdOnIndex" }
SAXO_INSTRUMENTS.NASDAQ  // { uic: 1048, assetType: "CfdOnIndex" }

// Commodities
SAXO_INSTRUMENTS.GOLD    // { uic: 73, assetType: "CfdOnCommodity" }
SAXO_INSTRUMENTS.OIL     // { uic: 37, assetType: "CfdOnCommodity" }
```

---

## ⏱️ Timeframes (Horizons)

```typescript
SAXO_HORIZONS = {
  "1m": 1,      // 1 minute
  "5m": 5,      // 5 minutes
  "15m": 15,    // 15 minutes
  "1H": 60,     // 1 hour
  "4H": 240,    // 4 hours
  "1D": 1440,   // 1 day
  "1W": 10080,  // 1 week
}
```

---

## 🛡️ Security Warning

**❌ NEVER expose App Secret in frontend!**

```typescript
// BAD ❌
const client = new SaxoAPIClient({
  appKey: "abc",
  appSecret: "secret", // ← EXPOSED TO CLIENT!
});

// GOOD ✅
// Token exchange on backend (API route)
// app/api/saxo/token/route.ts
export async function POST(request: Request) {
  const { code } = await request.json();
  
  const response = await fetch("https://sim.logonvalidation.net/token", {
    body: new URLSearchParams({
      code,
      client_secret: process.env.SAXO_APP_SECRET, // ← Safe on server
    }),
  });
  
  return Response.json(await response.json());
}
```

---

## 📊 Data Format

### Our Unified Candle Type
```typescript
interface Candle {
  time: number;    // Unix timestamp
  open: number;    // Mid price
  high: number;    // Mid price
  low: number;     // Mid price
  close: number;   // Mid price
  volume: number;  // 0 for FX (not available)
}
```

**Note**: Saxo adapter automatically converts their format to match!

---

## ⚠️ Important Notes

1. **SIM vs LIVE**: Always test in SIM first!
2. **UICs Differ**: Instrument codes are DIFFERENT in SIM vs LIVE
3. **Token Expiry**: Tokens expire after few hours, implement refresh!
4. **No Volume**: FX pairs don't have volume data
5. **Rate Limits**: Don't spam API, implement throttling

---

## 🔗 Quick Links

- **Developer Portal**: https://www.developer.saxo/
- **API Docs**: https://www.developer.saxo/openapi/learn
- **Migration Guide**: See `SAXO_MIGRATION.md`
- **Comparison**: See `API_COMPARISON.md`

---

## 💡 Pro Tips

1. Start with **EURUSD** (uic: 21) - simplest to test
2. Use **SIM environment** for all testing
3. **Cache tokens** to avoid repeated auth flows
4. **Handle errors** gracefully (API can fail!)
5. **Log everything** during development

---

## 🎯 Current Status

- ✅ Adapter: Ready
- ✅ Documentation: Complete
- ✅ Configuration: Set up
- ✅ Build: Success
- ⏳ OAuth Flow: You need to implement
- ⏳ Backend Proxy: You need to create

---

**Next Step**: Read `SAXO_MIGRATION.md` for complete implementation guide! 📖
