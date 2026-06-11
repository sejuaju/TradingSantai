# 🚀 Saxo Bank OAuth Setup Guide

## ✅ Prerequisites
- [x] Saxo Bank account created
- [ ] Saxo Developer Portal access
- [ ] App credentials obtained
- [ ] Environment variables configured

---

## 📋 Step-by-Step Setup

### Step 1: Get API Credentials from Saxo Developer Portal

1. **Login to Developer Portal**
   - Go to: https://www.developer.saxo/
   - Login dengan Saxo account Anda

2. **Create New Application**
   - Navigate to **"My Apps"** or **"Applications"**
   - Click **"Create New App"** atau **"Register Application"**
   
3. **Fill Application Details**
   ```
   Application Name: TradingSantai Terminal
   Description: Trading terminal with market data and signals
   Application Type: Web Application
   Grant Types: Authorization Code
   ```

4. **Set Redirect URI**
   ```
   http://localhost:3000/auth/callback
   ```
   ⚠️ **IMPORTANT**: Must match exactly!

5. **Copy Credentials**
   After creating the app, you'll get:
   - **App Key** (Client ID) - Looks like: `abc123def456...`
   - **App Secret** (Client Secret) - Looks like: `xyz789uvw012...`
   
   📝 **Save these somewhere safe!**

---

### Step 2: Configure Environment Variables

1. **Create `.env.local` file**
   ```bash
   # In your project root
   cp .env.local.example .env.local
   ```

2. **Edit `.env.local`** and paste your credentials:
   ```env
   # Saxo Bank API Configuration
   NEXT_PUBLIC_SAXO_APP_KEY=your_app_key_here
   SAXO_APP_SECRET=your_app_secret_here
   
   # Environment (use SIM for testing)
   NEXT_PUBLIC_SAXO_ENVIRONMENT=SIM
   
   # Redirect URI (must match Developer Portal)
   NEXT_PUBLIC_SAXO_REDIRECT_URI=http://localhost:3000/auth/callback
   
   # Session secret (generate random 32+ character string)
   SESSION_SECRET=your_random_32_character_string_here
   ```

3. **Generate Session Secret**
   Run this in terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the output and paste as `SESSION_SECRET`

---

### Step 3: Build & Run

1. **Install dependencies** (if not done yet)
   ```bash
   npm install
   ```

2. **Run development server**
   ```bash
   npm run dev
   ```

3. **Open browser**
   ```
   http://localhost:3000
   ```

---

### Step 4: Test Saxo Login

1. **In the terminal**, you should see a button: **"LOGIN WITH SAXO"** in the title bar

2. **Click "LOGIN WITH SAXO"**
   - You'll be redirected to Saxo login page
   - Login dengan Saxo credentials Anda
   - Authorize the application

3. **After authorization**
   - You'll be redirected back to `http://localhost:3000/auth/callback`
   - Should see "AUTHENTICATION SUCCESS"
   - Auto-redirect back to terminal in 2 seconds

4. **Verify connection**
   - Button should now say: **"SAXO CONNECTED ●"** (green)
   - Now you can select Forex/Gold/Stocks instruments!

---

### Step 5: Test Forex/Gold Instruments

1. **Click instrument selector**
2. **Choose Forex category**
3. **Select EUR/USD** (or any forex pair)
4. **Chart should load!** 🎉

---

## 🔧 Troubleshooting

### Issue: "NEXT_PUBLIC_SAXO_APP_KEY is not configured"

**Solution**: 
- Check if `.env.local` file exists
- Restart dev server after creating `.env.local`
- Make sure variables start with `NEXT_PUBLIC_` (for client-side) or nothing (for server-side)

### Issue: Redirect URI mismatch

**Error**: `redirect_uri_mismatch` or `invalid_request`

**Solution**:
1. Check redirect URI in `.env.local` matches Developer Portal **exactly**
2. For localhost: `http://localhost:3000/auth/callback` (no trailing slash!)
3. For production: `https://yourdomain.com/auth/callback`

### Issue: Invalid client credentials

**Error**: `invalid_client` or `unauthorized_client`

**Solution**:
- Double-check App Key and App Secret copied correctly
- Make sure no extra spaces or line breaks
- Try regenerating credentials in Developer Portal

### Issue: Token expired

**Solution**:
- Tokens auto-refresh in the background
- If still issues, click "DISCONNECT" and login again

### Issue: CORS errors

**Solution**:
- This is normal for direct browser calls to Saxo API
- In production, use backend proxy (Next.js API routes)
- For now, test with SIM environment

---

## 🌐 Production Deployment

### Security Checklist

⚠️ **NEVER commit `.env.local` to Git!**

1. **Use Environment Variables**
   - In Vercel/Netlify: Add env vars in dashboard
   - Never expose `SAXO_APP_SECRET` to client

2. **Update Redirect URI**
   - In Saxo Developer Portal, add production URL:
     ```
     https://yourdomain.com/auth/callback
     ```
   - Update `.env.local`:
     ```
     NEXT_PUBLIC_SAXO_REDIRECT_URI=https://yourdomain.com/auth/callback
     ```

3. **Use HTTPS**
   - Saxo requires HTTPS in production
   - Localhost HTTP is okay for development

4. **Switch to LIVE Environment** (when ready)
   ```env
   NEXT_PUBLIC_SAXO_ENVIRONMENT=LIVE
   ```

---

## 📊 What Works After Setup

### ✅ Available with Saxo Auth:
- **7 Forex pairs**: EUR/USD, GBP/USD, USD/JPY, etc.
- **4 Commodities**: Gold, Silver, WTI Oil, Brent Oil
- **7 Stocks**: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META
- **3 Indices**: S&P 500, Dow Jones, NASDAQ 100
- **Real-time market data**
- **Historical charts**
- **Live WebSocket streaming**
- **All technical indicators**

### ✅ Still Works (No Auth Required):
- **8 Crypto pairs** via Binance

---

## 🎯 Quick Test Checklist

- [ ] Created Saxo Developer account
- [ ] Created app in Developer Portal
- [ ] Got App Key and App Secret
- [ ] Created `.env.local` with credentials
- [ ] Restarted dev server
- [ ] Clicked "LOGIN WITH SAXO" button
- [ ] Successfully authenticated
- [ ] Button shows "SAXO CONNECTED"
- [ ] Selected EUR/USD from Forex category
- [ ] Chart loaded with data

---

## 📞 Need Help?

### Common Questions

**Q: Do I need real money in Saxo account?**
A: No! Use SIM environment for testing (paper trading).

**Q: Is this free?**
A: Saxo Developer access is free. Real trading requires funded account.

**Q: Can I test without Saxo account?**
A: No, OAuth requires valid Saxo account. But you can use Binance crypto (no auth needed).

**Q: How long are tokens valid?**
A: Access tokens: 20 minutes. Refresh tokens: 1 hour. Auto-refreshed in background.

**Q: Can multiple users login?**
A: Yes, each user needs their own Saxo account and will login separately.

---

## 🚀 Ready?

**Your checklist:**
1. ✅ Get App Key & Secret from https://www.developer.saxo/
2. ✅ Create `.env.local` with credentials
3. ✅ Restart dev server: `npm run dev`
4. ✅ Click "LOGIN WITH SAXO"
5. ✅ Test EUR/USD or Gold!

**Need the credentials? Go to**: https://www.developer.saxo/ → My Apps → Create New App

---

**Last Updated**: June 10, 2026  
**Version**: 2.2.0  
**Status**: OAuth implementation complete, waiting for your credentials! 🎉
