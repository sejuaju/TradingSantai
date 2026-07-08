"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  MousePointerClick,
  SlidersHorizontal,
  Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthTrigger from "@/components/auth/AuthTrigger";
import { C, D, T } from "./shared";
import type { Instrument } from "./config";
import type { Signal } from "./types";

const MX = "var(--font-geist-mono), ui-monospace, Menlo, monospace";
const row = (g = 0): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: g });
const col = (g = 0): React.CSSProperties => ({ display: "flex", flexDirection: "column", gap: g });

const CARD: React.CSSProperties = {
  borderRadius: 12,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

interface Props {
  signals: Signal[];
  isFullscreen?: boolean;
  instrument?: Instrument | null;
  currentPrice?: number;
}

const LOT_MIN = 0.01;
const LOT_MAX = 100;
const LOT_STEP = 0.01;

function clampLot(value: number): number {
  const stepped = Math.round(value / LOT_STEP) * LOT_STEP;
  return Math.min(LOT_MAX, Math.max(LOT_MIN, stepped));
}

function formatLot(value: number): string {
  return value.toFixed(2);
}

function getPointSize(instrument?: Instrument | null): number {
  const category = instrument?.category ?? "crypto";
  const symbol = instrument?.symbol ?? "";
  if (category === "forex") return symbol.includes("JPY") ? 0.001 : 0.00001;
  if (category === "commodities") return 0.01;
  return 0.01;
}

function getSpreadPoints(instrument?: Instrument | null): number {
  const category = instrument?.category ?? "crypto";
  if (category === "forex") return instrument?.symbol?.includes("JPY") ? 15 : 11;
  if (category === "commodities") return 11;
  if (category === "crypto") return 1;
  return 10;
}

/** Pecah harga ala MT4: integer kecil + pip besar (mis. 62182 + 71 → 62182.71). */
function splitQuotePrice(
  price: number,
  instrument?: Instrument | null,
): { integer: string; pip: string } {
  if (price <= 0) return { integer: "—", pip: "" };

  const category = instrument?.category ?? "crypto";
  const symbol = instrument?.symbol ?? "";

  if (category === "forex" && !symbol.includes("JPY")) {
    const [whole, fraction = ""] = price.toFixed(5).split(".");
    return { integer: `${whole}.${fraction.slice(0, 2)}`, pip: fraction.slice(2) };
  }

  if (category === "forex" && symbol.includes("JPY")) {
    const [whole, fraction = ""] = price.toFixed(3).split(".");
    return { integer: whole, pip: fraction };
  }

  const [whole, fraction = ""] = price.toFixed(2).split(".");
  return { integer: whole, pip: fraction };
}

function QuotePricePanel({
  integer,
  pip,
  side,
  disabled,
}: {
  integer: string;
  pip: string;
  side: "bid" | "ask";
  disabled: boolean;
}) {
  const isBid = side === "bid";
  const accent = isBid ? C.red : C.green;
  const textColor = disabled ? T.mute : T.sub;
  const pipColor = disabled ? T.dim : accent;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 5,
        minHeight: 32,
        padding: "5px 8px 4px",
        background: disabled
          ? "rgba(255,255,255,0.02)"
          : isBid
            ? "rgba(239,68,68,0.08)"
            : "rgba(34,197,94,0.08)",
        borderRight: isBid ? D : undefined,
        borderLeft: !isBid ? D : undefined,
      }}
    >
      <span
        style={{
          fontFamily: MX,
          fontSize: 12,
          fontWeight: 700,
          color: textColor,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          paddingBottom: 1,
        }}
      >
        {integer}
      </span>
      {pip && (
        <span
          style={{
            fontFamily: MX,
            fontSize: 20,
            fontWeight: 800,
            color: pipColor,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            paddingBottom: 1,
          }}
        >
          {pip}
        </span>
      )}
    </div>
  );
}

/* ── Local building blocks ─────────────────────────────────────────────── */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  accent = C.cyan,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ ...row(9), alignItems: "center" }}>
        <span
          style={{
            width: 24, height: 24, borderRadius: 7, display: "flex", flexShrink: 0,
            alignItems: "center", justifyContent: "center",
            background: `${accent}20`, border: `1px solid ${accent}38`, color: accent,
          }}
        >
          <Icon size={13} strokeWidth={2.25} />
        </span>
        <span
          style={{
            fontFamily: MX, fontSize: 11, fontWeight: 800,
            letterSpacing: "0.13em", textTransform: "uppercase", color: T.body,
          }}
        >
          {title}
        </span>
      </div>
      {subtitle && (
        <p style={{ margin: "6px 0 0 33px", fontSize: 10, color: T.dim, lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function SliderField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step,
  format,
  accent,
  disabled,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  accent: string;
  disabled?: boolean;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div style={{ ...col(6), opacity: disabled ? 0.4 : 1, transition: "opacity 0.2s ease" }}>
      <div style={{ ...row(0), justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.body }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: accent, fontFamily: MX }}>{format(value)}</span>
      </div>
      <div
        className="agentsb-track"
        style={{ position: "relative", height: 5, borderRadius: 99, background: "rgba(255,255,255,0.08)" }}
      >
        <div
          style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`,
            background: accent, borderRadius: 99,
            transition: disabled ? "none" : "width 0.15s ease",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute", top: "50%", left: `${pct}%`,
            width: 12, height: 12, borderRadius: "50%", background: "#fff",
            border: `2px solid ${accent}`, transform: "translate(-50%, -50%)",
            pointerEvents: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.45)",
          }}
        />
        <input
          type="range"
          className="agentsb-range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(+e.target.value)}
          aria-label={label}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            opacity: 0, cursor: disabled ? "not-allowed" : "pointer", margin: 0,
          }}
        />
      </div>
      <span style={{ fontSize: 10, color: T.mute, lineHeight: 1.4 }}>{hint}</span>
    </div>
  );
}

function PillButton({
  label,
  active,
  onClick,
  accent = C.cyan,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      className="agentsb-btn"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer",
        border: active ? `1px solid ${accent}66` : "1px solid rgba(255,255,255,0.10)",
        background: active ? `${accent}22` : "rgba(255,255,255,0.04)",
        color: active ? accent : T.sub,
        fontFamily: MX, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      }}
    >
      {label}
    </button>
  );
}

function Toggle({
  on,
  onToggle,
  accent = C.green,
}: {
  on: boolean;
  onToggle: () => void;
  accent?: string;
}) {
  return (
    <button
      type="button"
      className="agentsb-btn"
      onClick={onToggle}
      aria-pressed={on}
      style={{
        width: 38, height: 21, borderRadius: 11, flexShrink: 0, padding: 0,
        border: "none", cursor: "pointer",
        background: on ? accent : "rgba(255,255,255,0.14)",
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute", top: 3, left: on ? 20 : 3,
          width: 15, height: 15, borderRadius: "50%", background: "#fff",
          transition: "left 0.2s ease",
          boxShadow: on ? `0 0 8px ${accent}` : "0 1px 3px rgba(0,0,0,0.3)",
        }}
      />
    </button>
  );
}

function ManualOrderTicket({
  lotSize,
  onLotChange,
  instrument,
  currentPrice,
  canExecute,
}: {
  lotSize: number;
  onLotChange: (value: number) => void;
  instrument?: Instrument | null;
  currentPrice?: number;
  canExecute: boolean;
}) {
  const pointSize = getPointSize(instrument);
  const spreadPoints = getSpreadPoints(instrument);
  const halfSpread = (spreadPoints * pointSize) / 2;
  const mid = currentPrice && currentPrice > 0 ? currentPrice : 0;
  const bid = mid > 0 ? mid - halfSpread : 0;
  const ask = mid > 0 ? mid + halfSpread : 0;
  const bidParts = splitQuotePrice(bid, instrument);
  const askParts = splitQuotePrice(ask, instrument);
  const disabled = !canExecute;

  const bumpLot = (delta: number) => onLotChange(clampLot(lotSize + delta));

  return (
    <div
      style={{
        borderRadius: 5,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        opacity: disabled ? 0.55 : 1,
        transition: "opacity 0.2s ease",
      }}
    >
      {/* Baris atas: SELL | ▼ 0.05 ▼ | BUY — grid 1fr agar lebar SELL = BUY */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "stretch",
          minHeight: 34,
        }}
      >
        <button
          type="button"
          className="agentsb-btn"
          disabled={disabled}
          aria-label="SELL at bid"
          style={{
            width: "100%",
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 10px",
            border: "none",
            borderRight: D,
            cursor: disabled ? "not-allowed" : "pointer",
            background: disabled
              ? "rgba(127,29,29,0.55)"
              : "linear-gradient(180deg, #f87171, #dc2626 55%, #b91c1c)",
            color: "#fff",
            boxShadow: disabled ? "none" : "0 2px 8px rgba(220,38,38,0.22)",
            fontFamily: MX,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.1em",
          }}
        >
          SELL
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            flex: "0 0 auto",
            borderRight: D,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <button
            type="button"
            disabled={disabled}
            onClick={() => bumpLot(-LOT_STEP)}
            aria-label="Kurangi lot"
            style={{
              width: 22,
              border: "none",
              borderRight: D,
              background: "rgba(255,255,255,0.03)",
              color: T.sub,
              cursor: disabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <ChevronDown size={11} strokeWidth={2.5} />
          </button>
          <input
            type="text"
            inputMode="decimal"
            value={formatLot(lotSize)}
            disabled={disabled}
            onChange={(e) => {
              const parsed = Number.parseFloat(e.target.value.replace(",", "."));
              if (!Number.isNaN(parsed)) onLotChange(clampLot(parsed));
            }}
            aria-label="Ukuran lot"
            style={{
              width: 48,
              border: "none",
              outline: "none",
              background: "transparent",
              color: T.main,
              textAlign: "center",
              fontFamily: MX,
              fontSize: 12,
              fontWeight: 700,
              padding: "0 2px",
            }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => bumpLot(LOT_STEP)}
            aria-label="Tambah lot"
            style={{
              width: 22,
              border: "none",
              borderLeft: D,
              background: "rgba(255,255,255,0.03)",
              color: T.sub,
              cursor: disabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <ChevronDown size={11} strokeWidth={2.5} />
          </button>
        </div>

        <button
          type="button"
          className="agentsb-btn"
          disabled={disabled}
          aria-label="BUY at ask"
          style={{
            width: "100%",
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 10px",
            border: "none",
            cursor: disabled ? "not-allowed" : "pointer",
            background: disabled
              ? "rgba(20,83,45,0.55)"
              : "linear-gradient(180deg, #4ade80, #16a34a 55%, #15803d)",
            color: "#fff",
            boxShadow: disabled ? "none" : "0 2px 8px rgba(22,163,74,0.22)",
            fontFamily: MX,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.1em",
          }}
        >
          BUY
        </button>
      </div>

      {/* Baris bawah: dua panel biru saja — tanpa angka tengah (sesuai gambar pecahan) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          alignItems: "stretch",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <QuotePricePanel
          integer={bidParts.integer}
          pip={bidParts.pip}
          side="bid"
          disabled={disabled}
        />

        <QuotePricePanel
          integer={askParts.integer}
          pip={askParts.pip}
          side="ask"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

/** Read-only value tile — used for Trailing Stop's 3 fixed parameters. */
function ValueTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 8,
        background: `${accent}14`, border: `1px solid ${accent}28`,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: T.main, fontFamily: MX, whiteSpace: "nowrap" }}>{value}</div>
      <div
        style={{
          fontSize: 8, color: T.mute, marginTop: 3, letterSpacing: "0.05em",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

export function AgentSidebar({
  isFullscreen = false,
  instrument = null,
  currentPrice = 0,
}: Props) {
  const { user, loading: authLoading } = useAuth();
  const canExecute = !!user;

  const [autoOn, setAutoOn] = useState(false);
  const [riskMode, setRiskMode] = useState<"NORMAL" | "SMART" | "OCA">("NORMAL");
  const [allocPct, setAllocPct] = useState(90);
  const [lotSize, setLotSize] = useState(0.05);
  const [tradeRiskPct, setTradeRiskPct] = useState(2);
  const [rewardRatio, setRewardRatio] = useState(2);

  const panelWidth = isFullscreen ? "clamp(300px, 20vw, 400px)" : "280px";

  return (
    <aside
      aria-label="Panel kontrol agen trading"
      className="no-scrollbar"
      style={{
        width: panelWidth,
        flexShrink: 0,
        background: "#08090f",
        borderRight: D,
        fontFamily: MX,
        ...col(0),
        overflowY: "auto",
      }}
    >
      <style>{`
        .agentsb-btn { transition: transform .12s ease, filter .12s ease, box-shadow .12s ease; }
        .agentsb-btn:hover:not(:disabled) { filter: brightness(1.14); }
        .agentsb-btn:active:not(:disabled) { transform: scale(0.97); }
        .agentsb-btn:focus-visible { outline: 2px solid ${C.cyan}; outline-offset: 2px; }
        .agentsb-track:focus-within { box-shadow: 0 0 0 2px ${C.cyan}55; }
        @keyframes agentsbPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .agentsb-live-dot { animation: agentsbPulse 1.6s ease-in-out infinite; }
      `}</style>

      {/* ── OTOMATIS & RISIKO ────────────────────────────────────────────── */}
      <div style={{ padding: "14px 14px 12px" }}>
        <SectionHeader
          icon={SlidersHorizontal}
          title="Otomatis & Risiko"
          subtitle="Trading otomatis, trailing stop, dan alokasi modal."
          accent={C.purple}
        />

        <div style={{ ...CARD, padding: 12, ...col(11) }}>
          {/* Mode strategi — info read-only */}
          <div
            style={{
              ...row(0), justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", borderRadius: 9,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: T.body }}>Mode Strategi</span>
            <span
              style={{
                fontSize: 11, fontWeight: 800, color: C.cyan, fontFamily: MX,
                padding: "3px 10px", borderRadius: 6,
                background: `${C.cyan}18`, border: `1px solid ${C.cyan}30`,
              }}
            >
              STANDAR
            </span>
          </div>

          {/* Mode otomatis */}
          <div style={col(6)}>
            <div style={{ ...row(0), justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.body }}>Mode Otomatis</span>
              <Toggle on={autoOn} onToggle={() => setAutoOn((p) => !p)} accent={C.green} />
            </div>
            <div style={{ ...row(7), alignItems: "center" }}>
              <div
                className={autoOn ? "agentsb-live-dot" : undefined}
                style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: autoOn ? C.green : "rgba(255,255,255,0.15)",
                  boxShadow: autoOn ? `0 0 8px ${C.green}` : "none",
                }}
              />
              <span style={{ fontSize: 10, color: T.mute, lineHeight: 1.4 }}>
                Agen otomatis masuk posisi dari sinyal saat kondisi market terpenuhi.
              </span>
            </div>
          </div>

          {/* Trailing stop — info read-only */}
          <div style={col(6)}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.body }}>Trailing Stop</span>
            <div style={{ ...row(6) }}>
              <ValueTile label="TRAIL" value="20%" accent={C.blue} />
              <ValueTile label="AKTIVASI" value="60 poin" accent={C.blue} />
              <ValueTile label="OFFSET" value="0 poin" accent={C.blue} />
            </div>
          </div>

          {/* Alokasi posisi */}
          <SliderField
            label="Alokasi Posisi"
            hint="Porsi modal yang dipakai untuk tiap posisi baru."
            value={allocPct}
            onChange={setAllocPct}
            min={10}
            max={100}
            step={5}
            format={(v) => `${v}%`}
            accent={C.purple}
          />

          <div style={col(6)}>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.body }}>Mode Alokasi</span>
            <div style={{ ...row(6) }}>
              {(["NORMAL", "SMART", "OCA"] as const).map((m) => (
                <PillButton
                  key={m}
                  label={m}
                  active={riskMode === m}
                  onClick={() => setRiskMode(m)}
                  accent={C.purple}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODE MANUAL ──────────────────────────────────────────────────── */}
      <div style={{ padding: "12px 14px", borderTop: D }}>
        <SectionHeader
          icon={MousePointerClick}
          title="Mode Manual"
          subtitle="Klik BUY atau SELL — parameter risiko mengikuti pengaturan di bawah."
          accent={C.amber}
        />

        {!authLoading && !canExecute && (
          <div
            style={{
              marginBottom: 10, padding: "10px 12px", borderRadius: 10,
              background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.22)",
              ...col(6),
            }}
          >
            <div style={{ ...row(6) }}>
              <Lock size={13} color={C.purple} />
              <span style={{ fontSize: 10, fontWeight: 700, color: T.body }}>Login diperlukan</span>
            </div>
            <span style={{ fontSize: 9, color: T.dim, lineHeight: 1.45 }}>
              Chart dan sinyal tetap bisa dipantau. Login untuk mengaktifkan tombol BUY/SELL.
            </span>
            <AuthTrigger
              mode="login"
              style={{
                fontSize: 10, fontWeight: 700, color: C.cyan,
                background: "none", border: "none", padding: 0,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              Login sekarang →
            </AuthTrigger>
          </div>
        )}

        <div style={{ ...CARD, padding: 12, ...col(11) }}>
          <ManualOrderTicket
            lotSize={lotSize}
            onLotChange={setLotSize}
            instrument={instrument}
            currentPrice={currentPrice}
            canExecute={canExecute}
          />

          <SliderField
            label="Risiko per Trade"
            hint="Kerugian maksimum bila SL tersentuh (% dari modal)."
            value={tradeRiskPct}
            onChange={setTradeRiskPct}
            min={0.5}
            max={5}
            step={0.5}
            format={(v) => `${v}%`}
            accent={C.red}
            disabled={!canExecute}
          />

          <SliderField
            label="Target Risk : Reward"
            hint="Rasio jarak TP terhadap SL — 1:2 berarti TP dua kali lebih jauh."
            value={rewardRatio}
            onChange={setRewardRatio}
            min={1}
            max={5}
            step={0.5}
            format={(v) => `1 : ${v}`}
            accent={C.green}
            disabled={!canExecute}
          />

          <div
            style={{
              padding: "10px 11px", borderRadius: 9,
              background: `${C.cyan}0f`, border: `1px solid ${C.cyan}22`,
              fontSize: 10, color: T.sub, lineHeight: 1.6,
            }}
          >
            <span style={{ fontSize: 9, color: T.dim, display: "block", marginBottom: 3, letterSpacing: "0.08em" }}>
              RINGKASAN
            </span>
            Risiko <span style={{ color: C.red, fontWeight: 700 }}>{tradeRiskPct}%</span>
            {" · "}RR <span style={{ color: C.green, fontWeight: 700 }}>1:{rewardRatio}</span>
            {" · "}Lot <span style={{ color: C.cyan, fontWeight: 700 }}>{formatLot(lotSize)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
