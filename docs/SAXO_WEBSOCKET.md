# Saxo WebSocket Implementation Guide

## 📡 Overview

Implementasi WebSocket Saxo Bank untuk real-time market data streaming. Berbeda dengan Binance yang menggunakan WebSocket sederhana, Saxo memerlukan **Streaming Context** dan **Subscription Management** yang lebih kompleks.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          useMarketData.ts (React Hook)                   │   │
│  │                                                           │   │
│  │  • connectSaxoStream()                                   │   │
│  │  • WebSocket connection management                       │   │
│  │  • Message parsing & state updates                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes (Server)                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  /api/saxo/streaming-context                           │    │
│  │  • POST: Create streaming context                      │    │
│  │  • DELETE: Cleanup streaming context                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  /api/saxo/subscribe                                   │    │
│  │  • POST: Create chart subscription                     │    │
│  │  • DELETE: Remove subscription                         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  /api/saxo/accounts                                    │    │
│  │  • POST: Get AccountKey (required for subscriptions)   │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Saxo Bank OpenAPI                             │
│                                                                  │
│  • POST /streamingws/authorize → ContextId                      │
│  • POST /chart/v3/charts/subscriptions → ReferenceId           │
│  • WebSocket: wss://streaming.saxobank.com/sim/.../connect      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Connection Flow

### 1. **Initialization** (`connectSaxoStream()`)

```typescript
// Step 1: Get Access Token
const accessToken = await getAccessToken();

// Step 2: Resolve UIC (Unique Instrument Code)
const { uic, resolvedAssetType } = await getUIC(...);

// Step 3: Get AccountKey
const accountKey = await fetchAccountKey(accessToken);

// Step 4: Create Streaming Context
const { ContextId } = await POST /api/saxo/streaming-context

// Step 5: Create Chart Subscription
const { referenceId } = await POST /api/saxo/subscribe

// Step 6: Open WebSocket Connection
const ws = new WebSocket(
  `wss://streaming.saxobank.com/sim/openapi/streamingws/connect?contextId=${ContextId}`
);
```

### 2. **Message Handling**

Saxo WebSocket mengirim array of messages dalam format:

```json
[
  {
    "ReferenceId": "chart_21_1234567890",
    "MessageId": 1,
    "Data": {
      "Data": [
        {
          "Time": "2024-01-01T12:00:00Z",
          "OpenBid": 1.0850,
          "OpenAsk": 1.0852,
          "HighBid": 1.0860,
          "HighAsk": 1.0862,
          "LowBid": 1.0845,
          "LowAsk": 1.0847,
          "CloseBid": 1.0855,
          "CloseAsk": 1.0857
        }
      ]
    }
  }
]
```

**Processing:**
```typescript
ws.onmessage = (event) => {
  const messages = JSON.parse(event.data);
  
  for (const msg of messages) {
    if (msg.ReferenceId === referenceId && msg.Data) {
      // Calculate mid price from Bid/Ask
      const open = (OpenBid + OpenAsk) / 2;
      const close = (CloseBid + CloseAsk) / 2;
      // ... update candles
    }
  }
};
```

### 3. **Cleanup & Reconnection**

```typescript
ws.onclose = () => {
  // 1. Delete streaming context
  await DELETE /api/saxo/streaming-context
  
  // 2. Set connected = false
  setState({ connected: false });
  
  // 3. Schedule reconnect
  setTimeout(() => connectSaxoStream(), RECONNECT_DELAY_MS);
};
```

---

## 🔑 Key Differences: Saxo vs Binance

| Aspect | Binance | Saxo |
|--------|---------|------|
| **Authentication** | No auth required (public) | OAuth 2.0 Bearer Token |
| **Connection Setup** | Direct WebSocket URL | 3-step process (Context → Subscribe → Connect) |
| **URL Format** | `wss://stream.binance.com/ws/btcusdt@kline_1m` | `wss://streaming.saxobank.com/.../connect?contextId=...` |
| **Message Format** | Single object per message | Array of messages |
| **Price Format** | Single price value | Bid/Ask (need to calculate mid) |
| **Volume** | Always provided | Not available for FX |
| **Subscription** | Implicit in URL | Explicit API call required |

---

## 📋 API Routes

### `/api/saxo/streaming-context`

**POST** - Create new streaming context

**Request:**
```json
{
  "accessToken": "Bearer eyJ..."
}
```

**Response:**
```json
{
  "ContextId": "ctx_123456",
  "Transport": "WebSocket"
}
```

---

### `/api/saxo/subscribe`

**POST** - Create chart subscription

**Request:**
```json
{
  "accessToken": "Bearer eyJ...",
  "uic": 21,
  "assetType": "FxSpot",
  "contextId": "ctx_123456",
  "horizon": 15,
  "accountKey": "Cf4xZWiYL..."
}
```

**Response:**
```json
{
  "Snapshot": { ... },
  "referenceId": "chart_21_1234567890"
}
```

**DELETE** - Remove subscription

**Request:**
```json
{
  "accessToken": "Bearer eyJ...",
  "contextId": "ctx_123456",
  "referenceId": "chart_21_1234567890"
}
```

---

## 🐛 Debugging

### Enable Verbose Logging

Semua log WebSocket dimulai dengan prefix `[Saxo WS]`:

```javascript
console.log("[Saxo WS] Starting WebSocket connection setup...");
console.log("[Saxo WS] Context created:", contextId);
console.log("[Saxo WS] Subscription created:", referenceId);
console.log("[Saxo WS] ✅ Connected successfully");
console.log("[Saxo WS] 📊 Chart update received");
console.log("[Saxo WS] 💓 Heartbeat");
```

### Common Issues

1. **"Failed to create streaming context"**
   - Token expired → Login ulang
   - Wrong environment (LIVE vs SIM)

2. **"Failed to create subscription"**
   - Invalid UIC → Cek UIC cache
   - Missing AccountKey → Cek accounts API

3. **WebSocket disconnects immediately**
   - ContextId invalid
   - Network firewall blocking WSS

4. **No messages received**
   - Subscription not created properly
   - Wrong ReferenceId
   - Market closed (no updates during off-hours)

---

## 🚀 Usage

WebSocket akan otomatis terhubung ketika:
1. User login dengan Saxo account
2. Memilih instrument Saxo (forex, stocks, dll)
3. Component `useMarketData` mounted

**Indicator Connected:**
```typescript
const { connected, currentPrice, candles } = useMarketData("EURUSD");

// connected = true → WebSocket aktif ✅
// connected = false → Sedang reconnecting atau error ❌
```

**Visual Indicator:**
Di UI, lihat icon koneksi di TopInfoBar:
- 🟢 Connected → Real-time updates
- 🔴 Disconnected → Using cached/polling data

---

## 📊 Performance

- **Latency**: ~100-300ms (tergantung network)
- **Update Frequency**: Per candle completion (15m, 1h, dst)
- **Bandwidth**: ~1-5 KB per message
- **Reconnect Delay**: 3000ms (3 detik)

---

## 🔐 Security

1. **Access Token**: Dikirim via server-side API routes (tidak exposed ke client)
2. **WebSocket URL**: Hanya ContextId di URL (tidak ada token)
3. **CORS**: Next.js API routes handle CORS dengan aman
4. **Token Refresh**: Otomatis via `getAccessToken()`

---

## 📝 Notes

1. **Timeframe Support**: 
   - Sama dengan REST API (1m, 5m, 15m, 1h, 4h, 1d)
   - Horizon mapping di `saxoAdapter.ts`

2. **Multiple Instruments**:
   - Satu WebSocket connection per instrument
   - Auto cleanup ketika switch instrument

3. **Market Hours**:
   - FX: 24/5 (Senin-Jumat)
   - Stocks: Sesuai exchange hours
   - No updates outside trading hours

4. **Fallback**:
   - Jika WebSocket gagal, masih ada polling via `/api/saxo/price`
   - Polling interval: `UPDATE_INTERVALS.TICKER_24H_MS`

---

## 🎯 Future Improvements

- [ ] Handle multiple subscriptions efficiently
- [ ] Add message queue for high-frequency updates
- [ ] Implement heartbeat monitoring
- [ ] Add metrics/monitoring dashboard
- [ ] Support price alerts via WebSocket
- [ ] Batch subscription updates

---

## 📚 References

- [Saxo OpenAPI Streaming Docs](https://www.developer.saxo/openapi/learn/streaming)
- [Chart v3 API Reference](https://www.developer.saxo/openapi/referencedocs/chart/v3)
- [WebSocket Protocol](https://www.developer.saxo/openapi/learn/websocket-protocol)
