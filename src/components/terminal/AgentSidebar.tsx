"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  MousePointerClick,
  SlidersHorizontal,
  Lock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthTrigger from "@/components/auth/AuthTrigger";
import { C, D, T } from "./shared";
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

export function AgentSidebar({ isFullscreen = false }: Props) {
  const { user, loading: authLoading } = useAuth();
  const canExecute = !!user;

  const [autoOn, setAutoOn] = useState(false);
  const [riskMode, setRiskMode] = useState<"NORMAL" | "SMART" | "OCA">("NORMAL");
  const [allocPct, setAllocPct] = useState(90);
  const [lotSize] = useState(0.001);
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

        <div style={{ ...CARD, padding: 12, ...col(11), opacity: canExecute ? 1 : 0.5 }}>
          <div style={{ ...row(8) }}>
            <button
              type="button"
              className="agentsb-btn"
              disabled={!canExecute}
              aria-label="SELL at current price"
              style={{
                flex: 1, ...row(5), justifyContent: "center", padding: "8px 0",
                borderRadius: 5, border: "none", cursor: canExecute ? "pointer" : "not-allowed",
                background: canExecute
                  ? "linear-gradient(180deg, #f87171, #dc2626 55%, #b91c1c)"
                  : "rgba(127,29,29,0.55)",
                color: "#fff",
                boxShadow: canExecute ? "0 2px 8px rgba(220,38,38,0.22)" : "none",
              }}
            >
              <TrendingDown size={12} strokeWidth={2.5} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em" }}>SELL</span>
            </button>
            <button
              type="button"
              className="agentsb-btn"
              disabled={!canExecute}
              aria-label="BUY at current price"
              style={{
                flex: 1, ...row(5), justifyContent: "center", padding: "8px 0",
                borderRadius: 5, border: "none", cursor: canExecute ? "pointer" : "not-allowed",
                background: canExecute
                  ? "linear-gradient(180deg, #4ade80, #16a34a 55%, #15803d)"
                  : "rgba(20,83,45,0.55)",
                color: "#fff",
                boxShadow: canExecute ? "0 2px 8px rgba(22,163,74,0.22)" : "none",
              }}
            >
              <TrendingUp size={12} strokeWidth={2.5} />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em" }}>BUY</span>
            </button>
          </div>

          <div
            style={{
              ...row(0), justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", borderRadius: 9,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div style={col(2)}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.body }}>Ukuran Lot</span>
              <span style={{ fontSize: 9, color: T.mute }}>Volume per klik order.</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.cyan, fontFamily: MX }}>{lotSize}</span>
          </div>

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
            {" · "}Lot <span style={{ color: C.cyan, fontWeight: 700 }}>{lotSize}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
