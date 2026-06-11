# Multi-Instrument Trading Guide

## Overview

Trading Santai Terminal sekarang mendukung **29 instrument** dari **5 kategori** berbeda, dengan **2 broker** (Binance & Saxo Bank).

---

## 📊 Available Instruments

### 🪙 Cryptocurrency (8 instruments) - Binance
- **BTC/USDT** - Bitcoin
- **ETH/USDT** - Ethereum
- **BNB/USDT** - Binance Coin
- **SOL/USDT** - Solana
- **ADA/USDT** - Cardano
- **XRP/USDT** - Ripple
- **DOGE/USDT** - Dogecoin
- **DOT/USDT** - Polkadot

**Status**: ✅ Fully functional with real-time data

---

### 💱 Forex (7 pairs) - Saxo Bank
- **EUR/USD** - Euro / US Dollar
- **GBP/USD** - British Pound / US Dollar
- **USD/JPY** - US Dollar / Japanese Yen
- **AUD/USD** - Australian Dollar / US Dollar
- **USD/CAD** - US Dollar / Canadian Dollar
- **USD/CHF** - US Dollar / Swiss Franc
- **NZD/USD** - New Zealand Dollar / US Dollar

**Status**: ⚠️ Requires Saxo OAuth authentication (see [SAXO_MIGRATION.md](./SAXO_MIGRATION.md))

---

### 🥇 Commodities (4 instruments) - Saxo Bank
- **XAU/USD** - Gold
- **XAG/USD** - Silver
- **XTI/USD** - WTI Crude Oil
- **XBR/USD** - Brent Crude Oil

**Status**: ⚠️ Requires Saxo OAuth authentication

---

### 📈 Stocks (7 tech giants) - Saxo Bank
- **AAPL** - Apple Inc.
- **MSFT** - Microsoft Corp.
- **GOOGL** - Alphabet Inc.
- **AMZN** - Amazon.com Inc.
- **TSLA** - Tesla Inc.
- **NVDA** - NVIDIA Corp.
- **META** - Meta Platforms Inc.

**Status**: ⚠️ Requires Saxo OAuth authentication

---

### 📊 Indices (3 major) - Saxo Bank
- **US500** - S&P 500 Index
- **US30** - Dow Jones Industrial Average
- **NAS100** - NASDAQ 100 Index

**Status**: ⚠️ Requires Saxo OAuth authentication

---

## 🎯 How to Use

### 1. Switch Instruments

1. Click the **instrument selector button** (shows current symbol, e.g., "₿ BTCUSDT")
2. Choose a **category** from the left sidebar:
   - Cryptocurrency
   - Forex
   - Commodities
   - Stocks
   - Indices
3. Select your desired **instrument** from the list
4. The terminal will automatically:
   - Load historical data
   - Connect to live data stream (if Binance)
   - Update chart and indicators

### 2. Visual Indicators

**Broker Badge**:
- 🟡 **Yellow badge** = Binance (fully functional)
- 🔵 **Blue badge** = Saxo Bank (requires auth)

**Category Display**:
- Shown in the status bar at bottom
- Example: "CRYPTO", "FOREX", "COMMODITIES"

**Instrument Icon**:
- Each instrument has unique icon in selector
- Example: ₿ (Bitcoin), € (Euro), 🥇 (Gold), 🍎 (Apple)

---

## ⚙️ Configuration

### Adding New Instruments

Edit `src/components/terminal/config.ts`:

```typescript
export const INSTRUMENTS: Record<string, Instrument> = {
  // Add your new instrument
  "LINKUSDT": {
    id: "LINKUSDT",
    symbol: "LINKUSDT",
    displayName: "Chainlink",
    category: "crypto",
    broker: "BINANCE",
    icon: "🔗",
    description: "LINK/USDT",
    binanceSymbol: "LINKUSDT",
  },
  // ... existing instruments
};
```

### Changing Default Instrument

```typescript
export const DEFAULT_INSTRUMENT_ID = "ETHUSDT"; // Change from BTCUSDT
```

---

## 🔧 Technical Details

### How It Works

1. **Instrument Selection**
   - User clicks selector → Opens dropdown
   - User selects instrument → Triggers `setInstrumentId()`
   - Hook re-initializes with new symbol

2. **Data Loading**
   - Hook checks `instrument.broker`
   - If Binance: Fetch REST API + Connect WebSocket
   - If Saxo: Show "requires auth" (future implementation)

3. **WebSocket Connection**
   - Binance: `wss://stream.binance.com:9443/ws/{symbol}@kline_{interval}`
   - Saxo: Not yet implemented (requires OAuth token)

4. **Symbol Mapping**
   - Binance uses: `BTCUSDT`, `ETHUSDT`, etc.
   - Saxo uses: `EURUSD`, `XAUUSD`, `AAPL`, etc.
   - Automatic mapping via `instrument.binanceSymbol` or `instrument.symbol`

---

## 🚀 Future Enhancements

### Planned Features
- [ ] **Saxo Bank Integration**: Complete OAuth flow
- [ ] **Multi-chart Layout**: Compare multiple instruments
- [ ] **Favorites System**: Quick access to preferred instruments
- [ ] **Search Filter**: Search instruments by name/symbol
- [ ] **Price Alerts**: Set alerts for specific instruments
- [ ] **Watchlist**: Monitor multiple instruments simultaneously
- [ ] **Custom Instruments**: Add your own API endpoints

### Performance Optimizations
- [ ] Lazy loading instrument data
- [ ] Caching historical data
- [ ] WebSocket pooling for multiple instruments
- [ ] Virtual scrolling for large instrument lists

---

## 📝 Broker Comparison

| Feature | Binance | Saxo Bank |
|---------|---------|-----------|
| **Asset Classes** | Crypto only | Forex, Stocks, Commodities, Indices |
| **Authentication** | None required | OAuth 2.0 required |
| **Real-time Data** | ✅ Free | ⚠️ Requires account |
| **Historical Data** | ✅ Free | ⚠️ Requires account |
| **Instruments Available** | 8 crypto pairs | 21 instruments |
| **WebSocket Support** | ✅ Yes | ✅ Yes (after auth) |
| **Minimum Capital** | No minimum | Varies by region |

---

## 🐛 Troubleshooting

### Issue: Instrument not loading

**Symptoms**: Blank chart, no data, loading forever

**Solutions**:
1. Check browser console for errors
2. Verify internet connection
3. For Binance: Check if symbol exists on Binance
4. For Saxo: Verify OAuth is configured (see [SAXO_MIGRATION.md](./SAXO_MIGRATION.md))

### Issue: WebSocket disconnected

**Symptoms**: "OFFLINE" status, no live updates

**Solutions**:
1. Wait 3 seconds for auto-reconnect
2. Switch to different timeframe to force reconnect
3. Select different instrument and back
4. Check network/firewall blocking WebSocket

### Issue: Wrong price format

**Symptoms**: Too many decimals, wrong currency

**Solutions**:
1. Forex pairs: 4-5 decimals (e.g., 1.08543)
2. Crypto: 2 decimals for price (e.g., $42,567.89)
3. Stocks: 2 decimals (e.g., $173.45)
4. Check `formatPrice()` function if custom formatting needed

---

## 💡 Tips & Best Practices

1. **Start with Crypto**: Binance instruments work immediately
2. **Check Broker Badge**: Yellow = ready to use, Blue = needs setup
3. **Use Categories**: Filter by asset class for faster selection
4. **Monitor Multiple**: Open multiple browser tabs for different instruments
5. **Save Favorites**: Bookmark specific instrument URLs (future feature)

---

## 📞 Support

For questions or issues:
- Check this guide first
- Review [SAXO_MIGRATION.md](./SAXO_MIGRATION.md) for Saxo setup
- Check browser console for error messages
- Verify instrument exists in `config.ts`

---

## 📖 Related Documentation

- [Saxo Migration Guide](./SAXO_MIGRATION.md) - Setup Saxo Bank integration
- [API Comparison](./API_COMPARISON.md) - Binance vs Saxo comparison
- [Saxo Quick Start](./SAXO_QUICK_START.md) - 5-minute Saxo reference
- [Main README](../README.md) - General project documentation

---

**Version**: 2.1.0  
**Last Updated**: June 10, 2026  
**Total Instruments**: 29 (8 Binance + 21 Saxo)
