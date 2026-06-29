//+------------------------------------------------------------------+
//|                    TS_SMC_EA.mq5                                 |
//|        TradingSantai — SNR + Liquidity + MSS  Intraday EA       |
//|                                                                  |
//|  v1.50 — FVG / IFVG Confirmation Entry                          |
//|                                                                  |
//|  Perubahan dari v1.01:                                           |
//|  EA TIDAK langsung entry saat MSS terjadi.                       |
//|  Setelah MSS + Displacement → EA mendeteksi FVG atau IFVG       |
//|  yang terbentuk dari candle displacement.                        |
//|  Entry hanya terjadi ketika harga KEMBALI ke zona FVG/IFVG.     |
//|                                                                  |
//|  ALUR BARU:                                                      |
//|  H1 Bias → Sweep → Displacement → MSS                           |
//|    → Deteksi FVG / IFVG dari displacement                       |
//|    → Tunggu harga return ke FVG/IFVG                            |
//|    → Entry + SL di luar FVG + TP berbasis liquidity             |
//+------------------------------------------------------------------+
#property copyright "TradingSantai"
#property version   "1.50"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>

CTrade        Trade;
CPositionInfo PosInfo;

//+------------------------------------------------------------------+
//  ENUMS
//+------------------------------------------------------------------+
enum ENUM_BIAS  { BIAS_NONE, BIAS_BUY, BIAS_SELL };
enum ENUM_STATE
{
   STATE_WAIT_SWEEP,    // Menunggu sweep liquidity
   STATE_WAIT_DISPL,    // Menunggu displacement setelah sweep
   STATE_WAIT_MSS,      // Menunggu MSS setelah displacement
   STATE_WAIT_FVG,      // ★ BARU: Menunggu harga return ke FVG/IFVG
   STATE_IN_TRADE       // Posisi terbuka
};

//+------------------------------------------------------------------+
//  INPUTS
//+------------------------------------------------------------------+
input group "════ H1 Bias Settings ════"
input int    InpH1SwingLen    = 20;
input double InpPDZoneRatio   = 0.30;

input group "════ Trigger Settings (M5) ════"
input int    InpTriggerTF     = 5;
input int    InpSwingLenTrig  = 10;
input double InpDisplFactor   = 1.8;
input int    InpSweepLookback = 30;
input double InpEqualHLPips   = 5.0;

input group "════ FVG / IFVG Entry ════"
input double InpFVGEntryBuffer = 2.0;    // Buffer masuk FVG (pips) dari tepi zone
input bool   InpAllowIFVG      = true;   // Izinkan IFVG sebagai fallback jika FVG tidak ada
input int    InpFVGTimeout     = 30;     // Max bar menunggu harga return ke FVG (0=tidak ada timeout)
input bool   InpFVGMustHold    = true;   // FVG invalid jika harga close melewatinya (candle tembus)

input group "════ Risk Management ════"
input double InpRiskPct        = 1.0;
input double InpRRRatio        = 2.0;
input double InpSLBufferPips   = 3.0;
input int    InpMaxTrades      = 1;
input int    InpMagicNumber    = 20250519;

input group "════ Session Filter ════"
input bool   InpUseSession     = true;
input int    InpSessionStart   = 8;
input int    InpSessionEnd     = 20;

input group "════ Display ════"
input bool   InpShowPanel      = true;
input color  InpBuyColor       = C'8,153,129';
input color  InpSellColor      = C'242,54,69';

//+------------------------------------------------------------------+
//  CONSTANTS
//+------------------------------------------------------------------+
#define BULL    1
#define BEAR   -1
#define PFX_EA "TSSMC_"

//+------------------------------------------------------------------+
//  STRUCTS
//+------------------------------------------------------------------+
struct STrigger
{
   bool     sweepDone;
   bool     displDone;
   bool     mssDone;
   int      bias;
   double   sweepLevel;
   double   displHigh;
   double   displLow;
   int      displBar;        // Array index displacement candle (saat dideteksi)
   datetime displTime;       // ★ Waktu candle displacement (untuk re-find index)
   double   mssBreakLevel;
   datetime trigTime;

   void Reset()
   {
      sweepDone=false; displDone=false; mssDone=false;
      bias=0; sweepLevel=0; displHigh=0; displLow=0;
      displBar=0; displTime=0; mssBreakLevel=0; trigTime=0;
   }
};

// ★ BARU: Zona FVG atau IFVG untuk entry
struct SEntryZone
{
   double   top;           // Batas atas zona
   double   bot;           // Batas bawah zona
   bool     isIFVG;        // false=FVG, true=IFVG
   bool     valid;         // Zona masih berlaku
   datetime foundTime;     // Kapan zona ditemukan
   int      waitBars;      // Sudah berapa bar menunggu

   void Reset()
   {
      top=0; bot=0; isIFVG=false; valid=false;
      foundTime=0; waitBars=0;
   }

   bool HasZone() { return valid && top > 0 && bot > 0 && top > bot; }
};

//+------------------------------------------------------------------+
//  GLOBAL VARIABLES
//+------------------------------------------------------------------+
ENUM_BIAS   g_h1Bias     = BIAS_NONE;
ENUM_STATE  g_state      = STATE_WAIT_SWEEP;
STrigger    g_trig;
SEntryZone  g_zone;       // ★ Zona FVG/IFVG aktif

double      g_pip        = 0;
double      g_point      = 0;
datetime    g_lastBar5   = 0;
datetime    g_lastBarH1  = 0;
int         g_noDisplCnt = 0;
int         g_noMSSCnt   = 0;

// Panel
string PN_BIAS  = PFX_EA+"Bias";
string PN_STATE = PFX_EA+"State";
string PN_SWP   = PFX_EA+"Sweep";
string PN_DISP  = PFX_EA+"Displ";
string PN_MSS   = PFX_EA+"MSS";
string PN_FVG   = PFX_EA+"FVG";
string PN_TRADE = PFX_EA+"Trade";

//+------------------------------------------------------------------+
//  UTILITY
//+------------------------------------------------------------------+
ENUM_TIMEFRAMES TrigTF()
{
   return (InpTriggerTF == 1) ? PERIOD_M1 : PERIOD_M5;
}

double PipVal(double pips) { return pips * g_pip; }

double CalcLotSize(double slPips)
{
   if(slPips <= 0) return SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double riskAmt  = AccountInfoDouble(ACCOUNT_BALANCE) * InpRiskPct / 100.0;
   double tickVal  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double slMoney  = slPips * g_pip / tickSize * tickVal;
   double lots     = (slMoney > 0) ? riskAmt / slMoney : 0.01;
   double minLot   = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot   = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double stepLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   lots = MathFloor(lots / stepLot) * stepLot;
   return MathMax(minLot, MathMin(maxLot, lots));
}

bool IsSessionActive()
{
   if(!InpUseSession) return true;
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   return (dt.hour >= InpSessionStart && dt.hour < InpSessionEnd);
}

int CountOpenTrades()
{
   int cnt = 0;
   for(int i = 0; i < PositionsTotal(); i++)
      if(PosInfo.SelectByIndex(i))
         if(PosInfo.Symbol() == _Symbol && PosInfo.Magic() == InpMagicNumber)
            cnt++;
   return cnt;
}

double GetATR(ENUM_TIMEFRAMES tf, int period, int shift = 1)
{
   int    handle = iATR(_Symbol, tf, period);
   double buf[];
   ArraySetAsSeries(buf, true);
   if(CopyBuffer(handle, 0, shift, 1, buf) > 0) return buf[0];
   return 0;
}

double GetHighest(ENUM_TIMEFRAMES tf, int bars, int shift = 1)
{
   double buf[];
   ArraySetAsSeries(buf, true);
   if(CopyHigh(_Symbol, tf, shift, bars, buf) <= 0) return 0;
   return buf[ArrayMaximum(buf)];
}

double GetLowest(ENUM_TIMEFRAMES tf, int bars, int shift = 1)
{
   double buf[];
   ArraySetAsSeries(buf, true);
   if(CopyLow(_Symbol, tf, shift, bars, buf) <= 0) return 0;
   return buf[ArrayMinimum(buf)];
}

//+------------------------------------------------------------------+
//  RESET HELPER
//+------------------------------------------------------------------+
void ResetToSweep(string reason)
{
   g_noDisplCnt = 0;
   g_noMSSCnt   = 0;
   g_trig.Reset();
   g_zone.Reset();
   ClearTriggerObjects();
   g_state = STATE_WAIT_SWEEP;
   Print("Reset → ", reason);
}

//+------------------------------------------------------------------+
//  ─── STEP 1: H1 BIAS ─────────────────────────────────────────────
//+------------------------------------------------------------------+
ENUM_BIAS GetH1Bias()
{
   double rangeHigh = GetHighest(PERIOD_H1, InpH1SwingLen);
   double rangeLow  = GetLowest (PERIOD_H1, InpH1SwingLen);
   double range     = rangeHigh - rangeLow;
   if(range <= 0) return BIAS_NONE;
   double pos = (iClose(_Symbol, PERIOD_H1, 1) - rangeLow) / range;
   if(pos >= 1.0 - InpPDZoneRatio) return BIAS_SELL;
   if(pos <= InpPDZoneRatio)        return BIAS_BUY;
   return BIAS_NONE;
}

//+------------------------------------------------------------------+
//  ─── STEP 2A: SWEEP ──────────────────────────────────────────────
//+------------------------------------------------------------------+
bool CheckSweep(ENUM_BIAS bias, double &sweepLevel)
{
   ENUM_TIMEFRAMES tf = TrigTF();
   int   sz = InpSweepLookback + 5;
   double highs[], lows[], closes[];
   ArraySetAsSeries(highs,  true);
   ArraySetAsSeries(lows,   true);
   ArraySetAsSeries(closes, true);
   if(CopyHigh (_Symbol, tf, 0, sz, highs)  <= 0) return false;
   if(CopyLow  (_Symbol, tf, 0, sz, lows)   <= 0) return false;
   if(CopyClose(_Symbol, tf, 0, sz, closes) <= 0) return false;

   double candH = highs[1], candL = lows[1], candC = closes[1];

   for(int k = 2; k <= InpSweepLookback; k++)
   {
      double lvl = (bias == BIAS_BUY) ? lows[k] : highs[k];
      bool isEqual = false;
      for(int m = k+1; m <= MathMin(k+10, InpSweepLookback); m++)
      {
         double cmp = (bias == BIAS_BUY) ? lows[m] : highs[m];
         if(MathAbs(cmp - lvl) <= PipVal(InpEqualHLPips)) { isEqual = true; break; }
      }
      bool swept = (bias == BIAS_BUY)  ? (candL < lvl && candC > lvl)
                                       : (candH > lvl && candC < lvl);
      if(swept && (isEqual || k <= 5)) { sweepLevel = lvl; return true; }
   }
   return false;
}

//+------------------------------------------------------------------+
//  ─── STEP 2B: DISPLACEMENT ───────────────────────────────────────
//+------------------------------------------------------------------+
bool CheckDisplacement(ENUM_BIAS bias, double &displH, double &displL,
                       int &displBarIdx, datetime &displCandleTime)
{
   ENUM_TIMEFRAMES tf  = TrigTF();
   double atr          = GetATR(tf, 14, 2);
   if(atr <= 0) return false;
   double threshold    = atr * InpDisplFactor;

   double highs[], lows[], opens[], closes[];
   datetime times[];
   ArraySetAsSeries(highs,  true);
   ArraySetAsSeries(lows,   true);
   ArraySetAsSeries(opens,  true);
   ArraySetAsSeries(closes, true);
   ArraySetAsSeries(times,  true);

   if(CopyHigh (_Symbol, tf, 1, 5, highs)  <= 0) return false;
   if(CopyLow  (_Symbol, tf, 1, 5, lows)   <= 0) return false;
   if(CopyOpen (_Symbol, tf, 1, 5, opens)  <= 0) return false;
   if(CopyClose(_Symbol, tf, 1, 5, closes) <= 0) return false;
   if(CopyTime (_Symbol, tf, 1, 5, times)  <= 0) return false;

   for(int k = 0; k < 3; k++)
   {
      double body = MathAbs(closes[k] - opens[k]);
      if(body < threshold) continue;
      bool bullC = (closes[k] > opens[k]);
      bool bearC = (closes[k] < opens[k]);
      if(bias == BIAS_BUY  && bullC)
      {
         displH = highs[k]; displL = lows[k];
         displBarIdx = k + 1; displCandleTime = times[k];
         return true;
      }
      if(bias == BIAS_SELL && bearC)
      {
         displH = highs[k]; displL = lows[k];
         displBarIdx = k + 1; displCandleTime = times[k];
         return true;
      }
   }
   return false;
}

//+------------------------------------------------------------------+
//  ─── STEP 2C: MSS ────────────────────────────────────────────────
//+------------------------------------------------------------------+
bool CheckMSS(ENUM_BIAS bias, double displH, double displL, double &mssLevel)
{
   ENUM_TIMEFRAMES tf  = TrigTF();
   int    lookback     = InpSwingLenTrig + 5;
   double highs[], lows[], closes[];
   ArraySetAsSeries(highs,  true);
   ArraySetAsSeries(lows,   true);
   ArraySetAsSeries(closes, true);
   if(CopyHigh (_Symbol, tf, 1, lookback, highs)  <= 0) return false;
   if(CopyLow  (_Symbol, tf, 1, lookback, lows)   <= 0) return false;
   if(CopyClose(_Symbol, tf, 1, lookback, closes) <= 0) return false;

   if(bias == BIAS_BUY)
   {
      double swH = 0;
      for(int k = 1; k < InpSwingLenTrig && k+1 < lookback; k++)
         if(highs[k] > highs[k-1] && highs[k] > highs[k+1] && highs[k] < displH)
            { swH = highs[k]; break; }
      if(swH <= 0) swH = displH;
      if(closes[0] > swH) { mssLevel = swH; return true; }
   }
   else if(bias == BIAS_SELL)
   {
      double swL = DBL_MAX;
      for(int k = 1; k < InpSwingLenTrig && k+1 < lookback; k++)
         if(lows[k] < lows[k-1] && lows[k] < lows[k+1] && lows[k] > displL)
            { swL = lows[k]; break; }
      if(swL == DBL_MAX) swL = displL;
      if(closes[0] < swL) { mssLevel = swL; return true; }
   }
   return false;
}

//+------------------------------------------------------------------+
//  ★ STEP 3A: DETEKSI FVG DARI DISPLACEMENT                         |
//                                                                    |
//  FVG (Fair Value Gap) = imbalance 3 candle yang ditinggalkan       |
//  oleh candle displacement.                                          |
//                                                                    |
//  Pola 3 candle (array dengan ArraySetAsSeries=true, shift=1):      |
//    candle[d+1] = candle SEBELUM displacement (older)               |
//    candle[d]   = displacement candle itu sendiri                   |
//    candle[d-1] = candle SETELAH displacement (newer, closed)       |
//                                                                    |
//  Bullish FVG (untuk BUY):                                          |
//    lows[d-1]  > highs[d+1]  → ada gap antara mereka               |
//    FVG zone = [highs[d+1], lows[d-1]]                             |
//                                                                    |
//  Bearish FVG (untuk SELL):                                         |
//    highs[d-1] < lows[d+1]   → ada gap antara mereka               |
//    FVG zone = [highs[d-1], lows[d+1]] (top=lows[d+1])             |
//                                                                    |
//  Note: d = indeks displacement dalam array CopyHigh/CopyLow        |
//  Kita re-find indeks displacement menggunakan displCandleTime      |
//+------------------------------------------------------------------+
bool FindDisplFVG(ENUM_BIAS bias, datetime displCandleTime,
                  double &fvgTop, double &fvgBot)
{
   ENUM_TIMEFRAMES tf = TrigTF();

   // Ambil 30 bar untuk scan → cari displacement candle berdasarkan time
   int   total = 30;
   double highs[], lows[];
   datetime times[];
   ArraySetAsSeries(highs,  true);
   ArraySetAsSeries(lows,   true);
   ArraySetAsSeries(times,  true);

   if(CopyHigh(_Symbol, tf, 1, total, highs) <= 0) return false;
   if(CopyLow (_Symbol, tf, 1, total, lows)  <= 0) return false;
   if(CopyTime(_Symbol, tf, 1, total, times) <= 0) return false;

   // Cari index candle displacement berdasarkan waktu (tepat atau paling dekat)
   int d = -1;
   for(int i = 0; i < total; i++)
   {
      if(times[i] == displCandleTime) { d = i; break; }
   }

   // Jika tidak ketemu persis, cari yang paling dekat (dalam 2 period)
   if(d < 0)
   {
      for(int i = 0; i < total; i++)
      {
         if(MathAbs((int)(times[i] - displCandleTime)) <= InpTriggerTF * 60 * 2)
            { d = i; break; }
      }
   }

   if(d < 1 || d + 1 >= total) return false;  // Perlu d-1 dan d+1

   if(bias == BIAS_BUY)
   {
      // Bullish FVG: low[d-1] > high[d+1]
      // Candle setelah displacement (d-1) tidak overlap dengan candle sebelumnya (d+1)
      if(lows[d-1] > highs[d+1])
      {
         fvgBot = highs[d+1];   // Bottom FVG = high of candle before displacement
         fvgTop = lows[d-1];    // Top FVG    = low of candle after displacement
         // Validasi: zona harus cukup besar (min 1 pip)
         if(fvgTop - fvgBot >= PipVal(1.0)) return true;
      }
   }
   else if(bias == BIAS_SELL)
   {
      // Bearish FVG: high[d-1] < low[d+1]
      if(highs[d-1] < lows[d+1])
      {
         fvgTop = lows[d+1];    // Top FVG    = low of candle before displacement
         fvgBot = highs[d-1];   // Bottom FVG = high of candle after displacement
         if(fvgTop - fvgBot >= PipVal(1.0)) return true;
      }
   }
   return false;
}

//+------------------------------------------------------------------+
//  ★ STEP 3B: DETEKSI IFVG (Inverse FVG) SEBAGAI FALLBACK           |
//                                                                    |
//  IFVG = FVG yang sudah "dibalik" atau "inversed":                  |
//  Sebelum displacement bullish, ada downmove yang meninggalkan      |
//  bearish FVG. Ketika sweep + displacement bullish terjadi dan       |
//  menembus bearish FVG itu → FVG tersebut berubah menjadi           |
//  IFVG (kini bertindak sebagai support, bukan resistance).          |
//                                                                    |
//  Cari bearish FVG di antara sweep level dan displacement:          |
//    high[i-1] < low[i+1] → bearish FVG (zona = [high[i-1],low[i+1]])|
//    Jika displacement bullish sudah close DI ATAS zona ini →        |
//    zona bearish FVG sekarang adalah IFVG support.                  |
//+------------------------------------------------------------------+
bool FindIFVG(ENUM_BIAS bias, datetime displCandleTime, double displHigh,
              double displLow, double sweepLevel,
              double &fvgTop, double &fvgBot)
{
   if(!InpAllowIFVG) return false;

   ENUM_TIMEFRAMES tf = TrigTF();
   int   total = 50;
   double highs[], lows[];
   datetime times[];
   ArraySetAsSeries(highs,  true);
   ArraySetAsSeries(lows,   true);
   ArraySetAsSeries(times,  true);

   if(CopyHigh(_Symbol, tf, 1, total, highs) <= 0) return false;
   if(CopyLow (_Symbol, tf, 1, total, lows)  <= 0) return false;
   if(CopyTime(_Symbol, tf, 1, total, times) <= 0) return false;

   // Cari index candle displacement
   int displIdx = -1;
   for(int i = 0; i < total; i++)
      if(times[i] == displCandleTime) { displIdx = i; break; }
   if(displIdx < 0) return false;

   if(bias == BIAS_BUY)
   {
      // Cari bearish FVG di antara displacement dan sweep (older bars = higher index)
      // Scan dari displIdx+2 ke arah yang lebih tua (higher index)
      for(int i = displIdx + 2; i < total - 1; i++)
      {
         // Bearish FVG: high[i-1] < low[i+1]
         if(highs[i-1] < lows[i+1])
         {
            double ifvgTop = lows[i+1];
            double ifvgBot = highs[i-1];

            // Validasi: IFVG harus berada di bawah displacement high
            // dan displacement harus close DI ATAS IFVG (sudah tembus)
            if(ifvgTop < displHigh && displLow > ifvgBot)
            {
               // Zona IFVG = zona support baru (bekas resistance bearish FVG)
               fvgTop = ifvgTop;
               fvgBot = ifvgBot;
               if(fvgTop - fvgBot >= PipVal(1.0)) return true;
            }
         }
      }
   }
   else if(bias == BIAS_SELL)
   {
      // Cari bullish FVG sebelum displacement bearish
      for(int i = displIdx + 2; i < total - 1; i++)
      {
         // Bullish FVG: low[i-1] > high[i+1]
         if(lows[i-1] > highs[i+1])
         {
            double ifvgBot = highs[i+1];
            double ifvgTop = lows[i-1];

            // Displacement bearish harus close DI BAWAH IFVG
            if(ifvgBot > displLow && displHigh < ifvgTop)
            {
               fvgTop = ifvgTop;
               fvgBot = ifvgBot;
               if(fvgTop - fvgBot >= PipVal(1.0)) return true;
            }
         }
      }
   }
   return false;
}

//+------------------------------------------------------------------+
//  ★ STEP 3C: CEK APAKAH HARGA SUDAH RETURN KE ZONA FVG/IFVG        |
//                                                                    |
//  Kondisi harga "masuk zona" (touch / overlap):                     |
//    BUY : ask menyentuh atau masuk antara fvgBot dan fvgTop         |
//           ask <= fvgTop + buffer    AND    ask >= fvgBot - buffer   |
//                                                                    |
//  Kondisi FVG invalid (jika InpFVGMustHold = true):                 |
//    BUY : ada candle yang CLOSE di bawah fvgBot → FVG ditembus      |
//          → zona tidak valid, reset                                  |
//    SELL: ada candle yang CLOSE di atas fvgTop → FVG ditembus       |
//+------------------------------------------------------------------+
enum ENUM_FVG_CHECK { FVG_NOT_YET, FVG_ENTERED, FVG_INVALIDATED };

ENUM_FVG_CHECK CheckFVGReturn(ENUM_BIAS bias, SEntryZone &zone)
{
   if(!zone.HasZone()) return FVG_NOT_YET;

   double ask    = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid    = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double buf    = PipVal(InpFVGEntryBuffer);

   // Cek invalidasi: apakah ada bar closed yang menembus FVG
   if(InpFVGMustHold)
   {
      ENUM_TIMEFRAMES tf = TrigTF();
      double closes[];
      ArraySetAsSeries(closes, true);
      if(CopyClose(_Symbol, tf, 1, 3, closes) > 0)
      {
         if(bias == BIAS_BUY)
         {
            // Jika candle closed di bawah fvgBot → FVG ditembus ke bawah
            for(int i = 0; i < 3; i++)
               if(closes[i] < zone.bot - buf) return FVG_INVALIDATED;
         }
         else
         {
            // Jika candle closed di atas fvgTop → FVG ditembus ke atas
            for(int i = 0; i < 3; i++)
               if(closes[i] > zone.top + buf) return FVG_INVALIDATED;
         }
      }
   }

   // Cek apakah harga masuk zona
   if(bias == BIAS_BUY)
   {
      // Harga return turun ke FVG/IFVG → entry BUY
      if(ask <= zone.top + buf && ask >= zone.bot - buf)
         return FVG_ENTERED;
   }
   else if(bias == BIAS_SELL)
   {
      // Harga return naik ke FVG/IFVG → entry SELL
      if(bid >= zone.bot - buf && bid <= zone.top + buf)
         return FVG_ENTERED;
   }

   return FVG_NOT_YET;
}

//+------------------------------------------------------------------+
//  EXECUTE ENTRY (dari zona FVG/IFVG)
//+------------------------------------------------------------------+
bool ExecuteEntry(ENUM_BIAS bias, STrigger &trig, SEntryZone &zone)
{
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double entryPrice = 0, slPrice = 0, tpPrice = 0, slPips = 0;

   if(bias == BIAS_BUY)
   {
      entryPrice = ask;
      // SL di bawah minimum antara: zona FVG bottom, sweep level
      // Diambil yang paling rendah → perlindungan maksimal
      double slBase = MathMin(zone.bot, trig.sweepLevel);
      slPrice = slBase  - PipVal(InpSLBufferPips);
      slPips  = (entryPrice - slPrice) / g_pip;
      tpPrice = entryPrice + (entryPrice - slPrice) * InpRRRatio;
   }
   else if(bias == BIAS_SELL)
   {
      entryPrice = bid;
      // SL di atas maximum antara: zona FVG top, sweep level
      double slBase = MathMax(zone.top, trig.sweepLevel);
      slPrice = slBase  + PipVal(InpSLBufferPips);
      slPips  = (slPrice - entryPrice) / g_pip;
      tpPrice = entryPrice - (slPrice - entryPrice) * InpRRRatio;
   }

   if(slPips <= 0 || entryPrice <= 0) return false;

   double lots = CalcLotSize(slPips);
   int    digs = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   entryPrice  = NormalizeDouble(entryPrice, digs);
   slPrice     = NormalizeDouble(slPrice,    digs);
   tpPrice     = NormalizeDouble(tpPrice,    digs);

   Trade.SetExpertMagicNumber(InpMagicNumber);
   Trade.SetDeviationInPoints(20);

   string comment = "TSSMC " + (bias==BIAS_BUY?"BUY":"SELL")
                  + " | " + (zone.isIFVG?"IFVG":"FVG")
                  + " | Sweep+Displ+MSS";

   bool ok = (bias == BIAS_BUY)
             ? Trade.Buy (lots, _Symbol, entryPrice, slPrice, tpPrice, comment)
             : Trade.Sell(lots, _Symbol, entryPrice, slPrice, tpPrice, comment);

   if(ok)
      Print("ENTRY ",(bias==BIAS_BUY?"BUY":"SELL"),
            " via ",(zone.isIFVG?"IFVG":"FVG"),
            " | Lots=",lots,
            " | Entry=",entryPrice,
            " | SL=",slPrice," (",DoubleToString(slPips,1),"pip)",
            " | TP=",tpPrice,
            " | RR=",DoubleToString(InpRRRatio,1));
   else
      Print("Entry gagal: ", Trade.ResultRetcodeDescription());

   return ok;
}

//+------------------------------------------------------------------+
//  PANEL
//+------------------------------------------------------------------+
void CreateLabel(string name, int x, int y, string txt, color clr, int fs = 9)
{
   if(ObjectFind(0, name) < 0)
   {
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_CORNER,    CORNER_LEFT_UPPER);
      ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
      ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   }
   ObjectSetString( 0, name, OBJPROP_TEXT,      txt);
   ObjectSetInteger(0, name, OBJPROP_COLOR,     clr);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE,  fs);
   ObjectSetString( 0, name, OBJPROP_FONT,      "Consolas");
}

void DrawPanel()
{
   if(!InpShowPanel) return;

   string bg = PFX_EA+"BG";
   if(ObjectFind(0, bg) < 0)
   {
      ObjectCreate(0, bg, OBJ_RECTANGLE_LABEL, 0, 0, 0);
      ObjectSetInteger(0, bg, OBJPROP_CORNER,       CORNER_LEFT_UPPER);
      ObjectSetInteger(0, bg, OBJPROP_XDISTANCE,    10);
      ObjectSetInteger(0, bg, OBJPROP_YDISTANCE,    10);
      ObjectSetInteger(0, bg, OBJPROP_XSIZE,        270);
      ObjectSetInteger(0, bg, OBJPROP_YSIZE,        240);
      ObjectSetInteger(0, bg, OBJPROP_BGCOLOR,      C'20,20,30');
      ObjectSetInteger(0, bg, OBJPROP_BORDER_COLOR, C'60,60,80');
      ObjectSetInteger(0, bg, OBJPROP_BACK,         false);
   }

   CreateLabel(PFX_EA+"Title", 20, 18, "─ TradingSantai SMC EA v1.50 ─", C'180,180,220', 9);

   string biasStr = (g_h1Bias==BIAS_BUY) ? "BUY  (Discount)" :
                    (g_h1Bias==BIAS_SELL) ? "SELL (Premium)"  : "MIDDLE (Skip)";
   color  biasClr = (g_h1Bias==BIAS_BUY) ? InpBuyColor :
                    (g_h1Bias==BIAS_SELL) ? InpSellColor : clrGray;
   CreateLabel(PN_BIAS, 20, 38, "H1 Bias : "+biasStr, biasClr, 9);

   string stStr;
   switch(g_state)
   {
      case STATE_WAIT_SWEEP: stStr = "Menunggu Sweep";          break;
      case STATE_WAIT_DISPL: stStr = "Menunggu Displacement";   break;
      case STATE_WAIT_MSS:   stStr = "Menunggu MSS";            break;
      case STATE_WAIT_FVG:   stStr = ">>> Tunggu Return FVG <<<"; break;
      case STATE_IN_TRADE:   stStr = "Trade Aktif";             break;
      default:               stStr = "—";
   }
   color stClr = (g_state==STATE_WAIT_FVG)  ? InpBuyColor  :
                 (g_state==STATE_IN_TRADE)   ? InpSellColor : C'200,200,200';
   CreateLabel(PN_STATE, 20, 56, "Status  : "+stStr, stClr, 9);

   color actC = (g_h1Bias==BIAS_SELL) ? InpSellColor : InpBuyColor;

   CreateLabel(PN_SWP,  20,  80,
      g_trig.sweepDone ? "[OK] Sweep    @ "+DoubleToString(g_trig.sweepLevel,_Digits)
                       : "[  ] Sweep    : menunggu...",
      g_trig.sweepDone ? actC : clrGray, 9);

   CreateLabel(PN_DISP, 20,  98,
      g_trig.displDone ? "[OK] Displace : done"
                       : "[  ] Displace : menunggu...",
      g_trig.displDone ? actC : clrGray, 9);

   CreateLabel(PN_MSS,  20, 116,
      g_trig.mssDone ? "[OK] MSS      @ "+DoubleToString(g_trig.mssBreakLevel,_Digits)
                     : "[  ] MSS      : menunggu...",
      g_trig.mssDone ? actC : clrGray, 9);

   // FVG Zone info (★ baru)
   string fvgStr;
   color  fvgClr = clrGray;
   if(g_zone.HasZone())
   {
      string zoneType = g_zone.isIFVG ? "IFVG" : "FVG ";
      fvgStr = "[OK] "+zoneType+"     : "+DoubleToString(g_zone.bot,_Digits)
             + " - "+DoubleToString(g_zone.top,_Digits);
      fvgClr = (g_state==STATE_WAIT_FVG) ? actC : clrGray;
   }
   else
   {
      fvgStr = "[  ] FVG/IFVG : "+
               (g_trig.mssDone ? "tidak terdeteksi" : "menunggu MSS...");
   }
   CreateLabel(PN_FVG, 20, 134, fvgStr, fvgClr, 9);

   // Bar tunggu
   if(g_state == STATE_WAIT_FVG && InpFVGTimeout > 0)
   {
      string waitStr = "       Return  : "+IntegerToString(g_zone.waitBars)
                     + "/"+IntegerToString(InpFVGTimeout)+" bar";
      CreateLabel(PN_TRADE, 20, 152, waitStr, C'140,140,170', 9);
   }
   else
   {
      string posS = "Posisi  : "+IntegerToString(CountOpenTrades())
                  +" / "+IntegerToString(InpMaxTrades);
      CreateLabel(PN_TRADE, 20, 152, posS, C'160,160,200', 9);
   }

   CreateLabel(PFX_EA+"Pos", 20, 172,
      "Sesi    : "+(IsSessionActive()?"Aktif":"Di luar sesi"),
      IsSessionActive() ? C'100,180,120' : clrGray, 9);
}

void DeletePanel()
{
   string nms[] = { PFX_EA+"BG", PFX_EA+"Title", PN_BIAS, PN_STATE,
                    PN_SWP, PN_DISP, PN_MSS, PN_FVG, PN_TRADE, PFX_EA+"Pos" };
   for(int i = 0; i < ArraySize(nms); i++)
      if(ObjectFind(0, nms[i]) >= 0) ObjectDelete(0, nms[i]);
}

//+------------------------------------------------------------------+
//  CHART OBJECTS
//+------------------------------------------------------------------+
void DrawSweepLine(double lvl, ENUM_BIAS bias)
{
   string   nm  = PFX_EA+"SweepLvl";
   color    c   = (bias==BIAS_BUY) ? InpBuyColor : InpSellColor;
   ENUM_TIMEFRAMES tf = TrigTF();
   datetime t1  = iTime(_Symbol, tf, InpSweepLookback);
   datetime t2  = iTime(_Symbol, tf, 0) + (datetime)3600;
   if(ObjectFind(0, nm) < 0) ObjectCreate(0, nm, OBJ_TREND, 0, t1, lvl, t2, lvl);
   ObjectSetInteger(0, nm, OBJPROP_TIME,       0, t1);
   ObjectSetDouble( 0, nm, OBJPROP_PRICE,      0, lvl);
   ObjectSetInteger(0, nm, OBJPROP_TIME,       1, t2);
   ObjectSetDouble( 0, nm, OBJPROP_PRICE,      1, lvl);
   ObjectSetInteger(0, nm, OBJPROP_COLOR,      c);
   ObjectSetInteger(0, nm, OBJPROP_STYLE,      STYLE_DOT);
   ObjectSetInteger(0, nm, OBJPROP_WIDTH,      1);
   ObjectSetInteger(0, nm, OBJPROP_RAY_RIGHT,  false);
   ObjectSetInteger(0, nm, OBJPROP_SELECTABLE, false);
}

// ★ BARU: Gambar zona FVG/IFVG di chart
void DrawFVGZone(SEntryZone &zone, ENUM_BIAS bias)
{
   string nm  = PFX_EA+"FVGZone";
   color  c   = (bias==BIAS_BUY) ? InpBuyColor : InpSellColor;
   // IFVG pakai warna lebih terang (beda dari FVG)
   if(zone.isIFVG) c = (bias==BIAS_BUY) ? C'50,180,140' : C'220,80,80';
   long   fill = ColorToARGB(c, 35);

   ENUM_TIMEFRAMES tf = TrigTF();
   datetime t1 = zone.foundTime;
   datetime t2 = iTime(_Symbol, tf, 0) + (datetime)3600 * 8;

   if(ObjectFind(0, nm) < 0)
      ObjectCreate(0, nm, OBJ_RECTANGLE, 0, t1, zone.top, t2, zone.bot);

   ObjectSetInteger(0, nm, OBJPROP_TIME,       0, t1);
   ObjectSetDouble( 0, nm, OBJPROP_PRICE,      0, zone.top);
   ObjectSetInteger(0, nm, OBJPROP_TIME,       1, t2);
   ObjectSetDouble( 0, nm, OBJPROP_PRICE,      1, zone.bot);
   ObjectSetInteger(0, nm, OBJPROP_COLOR,      c);
   ObjectSetInteger(0, nm, OBJPROP_BGCOLOR,    fill);
   ObjectSetInteger(0, nm, OBJPROP_FILL,       true);
   ObjectSetInteger(0, nm, OBJPROP_BACK,       true);
   ObjectSetInteger(0, nm, OBJPROP_SELECTABLE, false);

   // Label FVG/IFVG di chart
   string lblNm = PFX_EA+"FVGLabel";
   string lblTxt = zone.isIFVG ? "IFVG" : "FVG";
   if(ObjectFind(0, lblNm) < 0)
      ObjectCreate(0, lblNm, OBJ_TEXT, 0, t1, zone.top);
   ObjectSetInteger(0, lblNm, OBJPROP_TIME,     0, t1);
   ObjectSetDouble( 0, lblNm, OBJPROP_PRICE,    0, zone.top + PipVal(1.5));
   ObjectSetString( 0, lblNm, OBJPROP_TEXT,     lblTxt);
   ObjectSetInteger(0, lblNm, OBJPROP_COLOR,    c);
   ObjectSetInteger(0, lblNm, OBJPROP_FONTSIZE, 8);
   ObjectSetInteger(0, lblNm, OBJPROP_SELECTABLE, false);
}

void ClearTriggerObjects()
{
   string nms[] = { PFX_EA+"SweepLvl", PFX_EA+"FVGZone", PFX_EA+"FVGLabel" };
   for(int i = 0; i < ArraySize(nms); i++)
      if(ObjectFind(0, nms[i]) >= 0) ObjectDelete(0, nms[i]);
}

//+------------------------------------------------------------------+
//  ─── MAIN STATE MACHINE ───────────────────────────────────────────
//+------------------------------------------------------------------+
void RunStateMachine()
{
   ENUM_TIMEFRAMES trigTF = TrigTF();

   datetime curBar = iTime(_Symbol, trigTF, 1);
   if(curBar == g_lastBar5) return;
   g_lastBar5 = curBar;

   if(CountOpenTrades() >= InpMaxTrades) { g_state = STATE_IN_TRADE; return; }
   if(!IsSessionActive()) { if(g_trig.sweepDone) ResetToSweep("Di luar sesi"); return; }

   ENUM_BIAS newBias = GetH1Bias();
   if(newBias != g_h1Bias)
   {
      g_h1Bias = newBias;
      ResetToSweep("Bias berubah → "+(g_h1Bias==BIAS_BUY?"BUY":g_h1Bias==BIAS_SELL?"SELL":"NONE"));
   }
   if(g_h1Bias == BIAS_NONE) return;

   switch(g_state)
   {
      //── STATE 1: WAIT SWEEP ───────────────────────────────────────
      case STATE_WAIT_SWEEP:
      {
         double lvl = 0;
         if(CheckSweep(g_h1Bias, lvl))
         {
            g_trig.sweepDone  = true;
            g_trig.sweepLevel = lvl;
            g_trig.bias       = (g_h1Bias==BIAS_BUY) ? BULL : BEAR;
            g_state           = STATE_WAIT_DISPL;
            DrawSweepLine(lvl, g_h1Bias);
            Print("SWEEP @ ", lvl);
         }
         break;
      }

      //── STATE 2: WAIT DISPLACEMENT ───────────────────────────────
      case STATE_WAIT_DISPL:
      {
         double   dH=0, dL=0;
         int      dBar=0;
         datetime dTime=0;

         if(CheckDisplacement(g_h1Bias, dH, dL, dBar, dTime))
         {
            g_trig.displDone  = true;
            g_trig.displHigh  = dH;
            g_trig.displLow   = dL;
            g_trig.displBar   = dBar;
            g_trig.displTime  = dTime;  // ★ Simpan waktu candle displacement
            g_noDisplCnt      = 0;
            g_state           = STATE_WAIT_MSS;
            Print("DISPLACEMENT H=",dH," L=",dL," Time=",TimeToString(dTime));
         }
         else
         {
            g_noDisplCnt++;
            if(g_noDisplCnt > 10) ResetToSweep("Displacement timeout");
         }
         break;
      }

      //── STATE 3: WAIT MSS ─────────────────────────────────────────
      case STATE_WAIT_MSS:
      {
         double mssLvl = 0;
         if(CheckMSS(g_h1Bias, g_trig.displHigh, g_trig.displLow, mssLvl))
         {
            g_trig.mssDone       = true;
            g_trig.mssBreakLevel = mssLvl;
            g_trig.trigTime      = TimeCurrent();
            g_noMSSCnt           = 0;

            Print("MSS @ ", mssLvl, " — Trigger lengkap. Cari FVG/IFVG...");

            // ★ DETEKSI FVG / IFVG SETELAH MSS DIKONFIRMASI
            double zTop=0, zBot=0;
            bool   foundZone = false;
            bool   isIFVG    = false;

            // Prioritas 1: FVG dari candle displacement
            if(FindDisplFVG(g_h1Bias, g_trig.displTime, zTop, zBot))
            {
               foundZone = true;
               isIFVG    = false;
               Print("FVG ditemukan: top=",zTop," bot=",zBot);
            }
            // Prioritas 2: IFVG dari FVG sebelum displacement (fallback)
            else if(FindIFVG(g_h1Bias, g_trig.displTime,
                             g_trig.displHigh, g_trig.displLow,
                             g_trig.sweepLevel, zTop, zBot))
            {
               foundZone = true;
               isIFVG    = true;
               Print("IFVG ditemukan: top=",zTop," bot=",zBot);
            }

            if(foundZone)
            {
               g_zone.top       = zTop;
               g_zone.bot       = zBot;
               g_zone.isIFVG    = isIFVG;
               g_zone.valid     = true;
               g_zone.foundTime = TimeCurrent();
               g_zone.waitBars  = 0;
               g_state          = STATE_WAIT_FVG;
               DrawFVGZone(g_zone, g_h1Bias);
               Print("Menunggu harga return ke ",
                     (isIFVG?"IFVG":"FVG")," [",zBot,"-",zTop,"]");
            }
            else
            {
               // Tidak ada FVG/IFVG → reset, setup tidak cukup valid
               Print("FVG/IFVG tidak ditemukan setelah MSS → reset setup");
               ResetToSweep("Tidak ada FVG/IFVG");
            }
         }
         else
         {
            g_noMSSCnt++;
            if(g_noMSSCnt > 8) ResetToSweep("MSS timeout");
         }
         break;
      }

      //── STATE 4: ★ WAIT FVG RETURN ───────────────────────────────
      // Harga harus kembali ke zona FVG/IFVG sebelum entry dilakukan.
      case STATE_WAIT_FVG:
      {
         g_zone.waitBars++;

         // Timeout: sudah terlalu lama menunggu
         if(InpFVGTimeout > 0 && g_zone.waitBars > InpFVGTimeout)
         {
            ResetToSweep("FVG return timeout ("+IntegerToString(g_zone.waitBars)+" bar)");
            break;
         }

         // Cek status harga vs FVG zone
         ENUM_FVG_CHECK status = CheckFVGReturn(g_h1Bias, g_zone);

         if(status == FVG_INVALIDATED)
         {
            // FVG ditembus (harga close melewatinya) → zona tidak valid
            Print("FVG/IFVG ditembus → reset setup");
            ResetToSweep("FVG invalidated (close melewati zona)");
         }
         else if(status == FVG_ENTERED)
         {
            // Harga masuk zona → entry!
            Print("Harga masuk ",g_zone.isIFVG?"IFVG":"FVG"," zone → eksekusi entry");
            if(ExecuteEntry(g_h1Bias, g_trig, g_zone))
            {
               g_state = STATE_IN_TRADE;
               g_trig.Reset();
               g_zone.Reset();
               // Hapus FVG zone setelah entry
               if(ObjectFind(0, PFX_EA+"FVGZone")  >= 0) ObjectDelete(0, PFX_EA+"FVGZone");
               if(ObjectFind(0, PFX_EA+"FVGLabel")  >= 0) ObjectDelete(0, PFX_EA+"FVGLabel");
            }
            // Jika entry gagal (misal spread terlalu lebar), coba lagi bar berikutnya
         }
         // FVG_NOT_YET → terus tunggu, tidak ada aksi
         break;
      }

      //── STATE 5: IN TRADE ────────────────────────────────────────
      case STATE_IN_TRADE:
      {
         if(CountOpenTrades() == 0)
            ResetToSweep("Trade selesai");
         break;
      }
   }
}

//+------------------------------------------------------------------+
//  OnInit
//+------------------------------------------------------------------+
int OnInit()
{
   g_point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int digs = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   g_pip    = (digs==5 || digs==3) ? g_point * 10.0 : g_point;

   Trade.SetExpertMagicNumber(InpMagicNumber);
   Trade.SetDeviationInPoints(30);
   Trade.SetTypeFilling(ORDER_FILLING_IOC);

   g_trig.Reset();
   g_zone.Reset();
   g_state      = STATE_WAIT_SWEEP;
   g_h1Bias     = BIAS_NONE;
   g_lastBar5   = 0;
   g_lastBarH1  = 0;
   g_noDisplCnt = 0;
   g_noMSSCnt   = 0;

   Print("TS SMC EA v1.50 | ",_Symbol," | TF=M",InpTriggerTF,
         " | Entry: FVG/IFVG confirmation");
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//  OnDeinit
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   DeletePanel();
   ClearTriggerObjects();
   ChartRedraw(0);
}

//+------------------------------------------------------------------+
//  OnTick
//+------------------------------------------------------------------+
void OnTick()
{
   datetime curH1 = iTime(_Symbol, PERIOD_H1, 1);
   if(curH1 != g_lastBarH1)
   {
      g_lastBarH1 = curH1;
      g_h1Bias    = GetH1Bias();
   }

   RunStateMachine();
   DrawPanel();
   ChartRedraw(0);
}

//+------------------------------------------------------------------+
//  OnTradeTransaction
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &request,
                        const MqlTradeResult      &result)
{
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
      if(trans.deal_type == DEAL_TYPE_BUY || trans.deal_type == DEAL_TYPE_SELL)
         Print("Deal #",trans.deal," | Vol=",trans.volume," @ ",trans.price);
}
//+------------------------------------------------------------------+
