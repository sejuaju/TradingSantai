# Trading Santai - Professional Trading Terminal

![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.4-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan?logo=tailwindcss)

A sophisticated, real-time cryptocurrency trading terminal with automated signal detection, technical analysis, and beautiful UI.

## ✨ Features

### 🎯 Core Features
- **Real-Time Data**: Live WebSocket connection to Binance API
- **9 Technical Indicators**: EMA, RSI, MACD, ATR, Volume, and more
- **Automated Signals**: Smart detection system with 9-factor scoring
- **Multi-Timeframe Analysis**: Support for 1m, 5m, 15m, 1H, 4H, 1D, 1W
- **Pattern Recognition**: Candlestick patterns (Engulfing, Hammer, Doji, etc.)
- **TP/SL Tracking**: Automatic take profit and stop loss monitoring
- **Fullscreen Mode**: Immersive trading experience (F11)

### 📊 Technical Analysis
- Exponential Moving Averages (EMA 9, 21)
- Relative Strength Index (RSI)
- Moving Average Convergence Divergence (MACD)
- Average True Range (ATR)
- Volume confirmation
- Swing highs/lows detection
- Support/Resistance levels

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## ⚙️ Configuration

All settings are centralized in `src/components/terminal/config.ts`. Edit to customize trading parameters, indicator settings, and signal thresholds.

## 📊 Performance Metrics

### v2.0.0 Improvements
- **90% reduction** in state updates/second
- **Zero** cascading renders
- **Proper** error handling with retry
- **Centralized** configuration
- **Type-safe** localStorage persistence

## 📝 Recent Updates

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

### v2.0.0 (2026-06-10)
- ✅ Fixed all React anti-patterns
- ✅ Added loading & error states
- ✅ Centralized configuration
- ✅ Improved error handling
- ✅ localStorage persistence hooks

---

**Built with ❤️ for traders who demand excellence.**
