# Instrument Status Guide

## Quick Reference: What Works Now?

### ✅ READY TO USE (8 Instruments)

**Cryptocurrency via Binance**

All crypto instruments work **immediately** with:
- ✅ Real-time price updates
- ✅ Live candlestick chart
- ✅ WebSocket streaming
- ✅ 24-hour ticker data
- ✅ All technical indicators (EMA, MACD, RSI, Volume)
- ✅ Signal detection system

**Available Now:**
1. **BTCUSDT** - Bitcoin / USDT
2. **ETHUSDT** - Ethereum / USDT
3. **BNBUSDT** - Binance Coin / USDT
4. **SOLUSDT** - Solana / USDT
5. **ADAUSDT** - Cardano / USDT
6. **XRPUSDT** - Ripple / USDT
7. **DOGEUSDT** - Dogecoin / USDT
8. **DOTUSDT** - Polkadot / USDT

---

### ⚠️ REQUIRES SETUP (21 Instruments)

**Forex, Stocks, Commodities, Indices via Saxo Bank**

These instruments are **configured** but need authentication:

#### What You'll See:
```
⚠️ BROKER NOT AVAILABLE

This instrument requires SAXO authentication.

Currently, only Binance cryptocurrency instruments are available.

To use Forex, Stocks, Commodities, or Indices:
Please refer to docs/SAXO_MIGRATION.md
```

#### Why?
Saxo Bank requires:
- OAuth 2.0 authentication
- API key/secret
- Active trading account
- Backend proxy for security

#### To Enable:
1. Read `docs/SAXO_MIGRATION.md`
2. Register at https://www.developer.saxo/
3. Get API credentials
4. Implement OAuth flow
5. Configure environment variables

**Pending Instruments (21):**

**Forex (7):**
- EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, NZDUSD

**Commodities (4):**
- XAUUSD (Gold), XAGUSD (Silver), XTIUSD (WTI Oil), XBRUSD (Brent Oil)

**Stocks (7):**
- AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META

**Indices (3):**
- US500 (S&P 500), US30 (Dow Jones), NAS100 (NASDAQ)

---

## Visual Guide

### When You Select BTC (Works ✅)

```
┌─────────────────────────────────────────┐
│ ₿ BTCUSDT ▾                             │
│                                         │
│ $62,456.78  +2.34%  [BINANCE]          │
├─────────────────────────────────────────┤
│                                         │
│     📊 LIVE CANDLESTICK CHART          │
│     Real-time updates                   │
│     All indicators active               │
│                                         │
└─────────────────────────────────────────┘
       ● LIVE (WebSocket connected)
```

### When You Select Gold (Needs Setup ⚠️)

```
┌─────────────────────────────────────────┐
│ 🥇 XAUUSD ▾                             │
│                                         │
│ $2,034.56  -0.12%  [SAXO]              │
├─────────────────────────────────────────┤
│                                         │
│        ⚠️ BROKER NOT AVAILABLE         │
│                                         │
│   This instrument requires SAXO         │
│   authentication.                       │
│                                         │
│   Currently, only Binance              │
│   cryptocurrency instruments            │
│   are available.                        │
│                                         │
│   To enable: docs/SAXO_MIGRATION.md    │
│                                         │
└─────────────────────────────────────────┘
       ● OFFLINE (No connection)
```

---

## How to Test

### Step 1: Test Crypto (Should Work)
1. Click instrument selector
2. Choose **Cryptocurrency** category
3. Select any crypto (e.g., **ETHUSDT**)
4. ✅ Chart should load immediately
5. ✅ WebSocket should connect (● LIVE)
6. ✅ Price updates in real-time

### Step 2: Test Forex (Shows Message)
1. Click instrument selector
2. Choose **Forex** category
3. Select any pair (e.g., **EURUSD**)
4. ⚠️ Should show "BROKER NOT AVAILABLE" message
5. ℹ️ Instructions to enable Saxo

### Step 3: Test Other Categories
- **Commodities** (Gold, Silver, Oil) → Same as Forex
- **Stocks** (AAPL, TSLA, etc.) → Same as Forex
- **Indices** (S&P 500, Dow) → Same as Forex

---

## Broker Badge Colors

```
🟡 BINANCE  = Yellow badge = Ready to use
🔵 SAXO     = Blue badge   = Needs setup
```

---

## FAQ

### Q: Why only Binance works?
**A:** Binance API is public and doesn't require authentication. Saxo Bank requires OAuth and trading account.

### Q: Can I use Saxo instruments without account?
**A:** No. Saxo requires active account + API credentials.

### Q: Is Binance free?
**A:** Yes, Binance public API is free for market data.

### Q: How long to setup Saxo?
**A:** Approximately 1-2 hours if you have account. Includes:
- Developer registration (15 min)
- API key generation (5 min)
- OAuth implementation (30-60 min)
- Testing (15-30 min)

### Q: Do I need to trade to use Saxo data?
**A:** No, but you need an approved developer account.

### Q: Can I add other brokers?
**A:** Yes! Create adapter in `src/components/terminal/adapters/` following Binance or Saxo pattern.

---

## Current Implementation Status

| Feature | Binance | Saxo |
|---------|---------|------|
| **REST API** | ✅ Implemented | ✅ Configured |
| **WebSocket** | ✅ Implemented | ✅ Configured |
| **Authentication** | ✅ Not required | ⚠️ Not implemented |
| **OAuth Flow** | ✅ N/A | ❌ Needs implementation |
| **Token Refresh** | ✅ N/A | ❌ Needs implementation |
| **Error Handling** | ✅ Complete | ⚠️ Basic |
| **Rate Limiting** | ✅ Handled | ⚠️ Needs handling |

---

## Next Steps

### For Users
1. **Start with crypto** - Test with BTCUSDT, ETHUSDT, etc.
2. **Explore UI** - Try switching between crypto instruments
3. **Test features** - Timeframes, indicators, signals
4. **Plan Saxo setup** if you need Forex/Stocks/Commodities

### For Developers
1. **Implement OAuth** - Follow `docs/SAXO_MIGRATION.md`
2. **Add token management** - Store & refresh access tokens
3. **Error handling** - Better Saxo error messages
4. **Rate limiting** - Implement request throttling
5. **Testing** - Unit tests for adapters

---

## Support

**Working Now**: Binance cryptocurrency instruments  
**Need Help**: Check `docs/SAXO_MIGRATION.md`  
**Report Issues**: Check browser console for errors

---

**Last Updated**: June 10, 2026  
**Version**: 2.1.1  
**Working Instruments**: 8/29 (27.6%)  
**Pending Implementation**: Saxo OAuth authentication
