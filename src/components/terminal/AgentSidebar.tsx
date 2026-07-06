"use client";

import { useState } from "react";
import { Lock, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthTrigger from "@/components/auth/AuthTrigger";
import { C, D, T } from "./shared";
import type { Signal } from "./types";

const MX = "monospace";
const row = (g = 0): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: g });
const col = (g = 0): React.CSSProperties => ({ display: "flex", flexDirection: "column", gap: g });

const CARD: React.CSSProperties = {
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
};

interface Props {
  signals: Signal[];
  isFullscreen?: boolean;
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...row(8), alignItems: "center" }}>
        <span style={{
          width: 22, height: 22, borderRadius: 6, display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(0,212,232,0.12)", border: "1px solid rgba(0,212,232,0.22)",
          fontSize: 11, color: C.cyan,
        }}>
          {icon}
        </span>
        <span style={{
          fontFamily: MX, fontSize: 11, fontWeight: 800,
          letterSpacing: "0.14em", textTransform: "uppercase", color: T.body,
        }}>
          {title}
        </span>
      </div>
      {subtitle && (
        <p style={{ margin: "6px 0 0 30px", fontSize: 9, color: T.dim, lineHeight: 1.4 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      ...CARD, padding: "10px 8px", textAlign: "center",
      display: "flex", flexDirection: "column", gap: 4, alignItems: "center",
    }}>
      <span style={{ fontSize: 9, color: T.dim, letterSpacing: "0.1em" }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 800, color, fontFamily: MX, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

function StatRow({ label, value, color = T.body }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      ...row(0), justifyContent: "space-between", padding: "7px 10px",
      borderRadius: 6, background: "rgba(255,255,255,0.02)",
    }}>
      <span style={{ fontFamily: MX, fontSize: 10, color: T.dim }}>{label}</span>
      <span style={{ fontFamily: MX, fontSize: 11, fontWeight: 700, color }}>{value}</span>
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
    <div style={{ ...col(5), opacity: disabled ? 0.45 : 1 }}>
      <div style={{ ...row(0), justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.body }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: accent }}>{format(value)}</span>
      </div>
      <div style={{ position: "relative", height: 5, borderRadius: 99, background: "rgba(255,255,255,0.08)" }}>
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`,
          background: accent, borderRadius: 99,
        }} />
        <input
          type="range"
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
      <span style={{ fontSize: 9, color: T.mute, lineHeight: 1.35 }}>{hint}</span>
    </div>
  );
}

function PillButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1, padding: "8px 0", borderRadius: 7, cursor: "pointer",
        border: active ? `1px solid ${C.cyan}55` : "1px solid rgba(255,255,255,0.10)",
        background: active ? "rgba(0,212,232,0.14)" : "rgba(255,255,255,0.04)",
        color: active ? C.cyan : T.sub,
        fontFamily: MX, fontSize: 10, fontWeight: 700,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export function AgentSidebar({ signals, isFullscreen = false }: Props) {
  const { user, loading: authLoading } = useAuth();
  const canExecute = !!user;

  const [autoOn, setAutoOn] = useState(false);
  const [riskMode, setRiskMode] = useState<"NORMAL" | "SMART" | "OCA">("NORMAL");
  const [allocPct, setAllocPct] = useState(90);
  const [lotSize] = useState(0.001);
  const [tradeRiskPct, setTradeRiskPct] = useState(2);
  const [rewardRatio, setRewardRatio] = useState(2);

  const win = signals.filter((s) => s.status === "win").length;
  const loss = signals.filter((s) => s.status === "loss").length;
  const closed = win + loss;
  const wr = closed > 0 ? Math.round((win / closed) * 100) : 0;
  const active = signals.filter((s) => s.status === "active");

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
      {/* ── 1. MONITOR AGEN ─────────────────────────────────────────────── */}
      <div style={{ padding: "14px 14px 12px" }}>
        <SectionHeader
          icon="●"
          title="Monitor Agen"
          subtitle="Ringkasan posisi dan performa sinyal saat ini"
        />

        <div style={{
          ...CARD, padding: 12, marginBottom: 8,
          background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(255,255,255,0.02))",
          border: "1px solid rgba(249,115,22,0.18)",
        }}>
          <span style={{ fontSize: 9, color: T.dim, letterSpacing: "0.1em" }}>WIN RATE</span>
          <div style={{ ...row(8), alignItems: "baseline", marginTop: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: C.orange, lineHeight: 1 }}>
              {closed > 0 ? `${wr}%` : "—"}
            </span>
            <span style={{ fontSize: 9, color: T.mute }}>
              {closed > 0 ? `${win} menang / ${closed} selesai` : "Belum ada data"}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <MetricCard label="AKTIF" value={active.length.toString()} color={C.cyan} />
          <MetricCard label="MENANG" value={win.toString()} color={C.green} />
          <MetricCard label="KALAH" value={loss.toString()} color={C.red} />
          <MetricCard label="SELESAI" value={closed.toString()} color={T.sub} />
        </div>
      </div>

      {/* ── 2. EKSEKUSI MANUAL ──────────────────────────────────────────── */}
      <div style={{ padding: "12px 14px", borderTop: D }}>
        <SectionHeader
          icon="★"
          title="Eksekusi Manual"
          subtitle="Klik BUY / SELL dengan parameter risiko yang kamu atur"
        />

        {!authLoading && !canExecute && (
          <div style={{
            marginBottom: 10, padding: "10px 12px", borderRadius: 10,
            background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.22)",
            ...col(6),
          }}>
            <div style={{ ...row(6) }}>
              <Lock size={13} color={C.purple} />
              <span style={{ fontSize: 10, fontWeight: 700, color: T.body }}>Login diperlukan</span>
            </div>
            <span style={{ fontSize: 9, color: T.dim, lineHeight: 1.45 }}>
              Chart dan sinyal tetap terbuka. Login untuk mengaktifkan tombol BUY / SELL.
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

        <div style={{ ...CARD, padding: 12, ...col(10), opacity: canExecute ? 1 : 0.5 }}>
          <div style={{ ...row(8) }}>
            <button
              type="button"
              disabled={!canExecute}
              aria-label="SELL at current price"
              style={{
                flex: 1, ...col(4), alignItems: "center", padding: "12px 0",
                borderRadius: 8, border: "none", cursor: canExecute ? "pointer" : "not-allowed",
                background: canExecute
                  ? "linear-gradient(180deg, #ef4444, #b91c1c)"
                  : "rgba(127,29,29,0.6)",
                color: "#fff", boxShadow: canExecute ? "0 4px 16px rgba(220,38,38,0.25)" : "none",
              }}
            >
              <TrendingDown size={14} strokeWidth={2.5} />
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em" }}>SELL</span>
            </button>
            <button
              type="button"
              disabled={!canExecute}
              aria-label="BUY at current price"
              style={{
                flex: 1, ...col(4), alignItems: "center", padding: "12px 0",
                borderRadius: 8, border: "none", cursor: canExecute ? "pointer" : "not-allowed",
                background: canExecute
                  ? "linear-gradient(180deg, #22c55e, #15803d)"
                  : "rgba(20,83,45,0.6)",
                color: "#fff", boxShadow: canExecute ? "0 4px 16px rgba(22,163,74,0.25)" : "none",
              }}
            >
              <TrendingUp size={14} strokeWidth={2.5} />
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.12em" }}>BUY</span>
            </button>
          </div>

          <div style={{
            ...row(0), justifyContent: "space-between", alignItems: "center",
            padding: "9px 11px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={col(2)}>
              <span style={{ fontSize: 9, color: T.dim, letterSpacing: "0.08em" }}>UKURAN LOT</span>
              <span style={{ fontSize: 9, color: T.mute }}>Volume per klik</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.cyan }}>{lotSize}</span>
          </div>

          <SliderField
            label="Risiko per Trade"
            hint="Kerugian maksimal jika SL kena (% modal)."
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
            hint="Jarak TP vs SL. 1:2 = TP dua kali lebih jauh."
            value={rewardRatio}
            onChange={setRewardRatio}
            min={1}
            max={5}
            step={0.5}
            format={(v) => `1 : ${v}`}
            accent={C.green}
            disabled={!canExecute}
          />

          <div style={{
            padding: "9px 11px", borderRadius: 8,
            background: "rgba(0,212,232,0.06)", border: "1px solid rgba(0,212,232,0.12)",
            fontSize: 10, color: T.sub, lineHeight: 1.5,
          }}>
            <span style={{ fontSize: 9, color: T.dim, display: "block", marginBottom: 3 }}>RINGKASAN</span>
            Risiko <span style={{ color: C.red, fontWeight: 700 }}>{tradeRiskPct}%</span>
            {" · "}RR <span style={{ color: C.green, fontWeight: 700 }}>1:{rewardRatio}</span>
            {" · "}Lot <span style={{ color: C.cyan, fontWeight: 700 }}>{lotSize}</span>
          </div>
        </div>
      </div>

      {/* ── 3. OTOMATIS & RISIKO ────────────────────────────────────────── */}
      <div style={{ padding: "12px 14px", borderTop: D }}>
        <SectionHeader
          icon="⚙"
          title="Otomatis & Risiko"
          subtitle="Mode strategi otomatis dan alokasi posisi"
        />

        <div style={{ ...CARD, padding: 12, ...col(10) }}>
          <div style={{
            ...row(0), justifyContent: "space-between", alignItems: "center",
            padding: "8px 10px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <span style={{ fontSize: 10, color: T.dim }}>MODE STRATEGI</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.cyan }}>STANDAR ▾</span>
          </div>

          <div style={{ ...row(6) }}>
            <button
              type="button"
              onClick={() => setAutoOn((p) => !p)}
              aria-pressed={autoOn}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 7, cursor: "pointer",
                border: autoOn ? `1px solid ${C.green}55` : "1px solid rgba(255,255,255,0.10)",
                background: autoOn ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.04)",
                color: autoOn ? C.green : T.sub,
                fontFamily: MX, fontSize: 10, fontWeight: 700,
              }}
            >
              {autoOn ? "OTOMATIS ON" : "OTOMATIS OFF"}
            </button>
            <button
              type="button"
              style={{
                flex: 1, padding: "9px 0", borderRadius: 7, cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)", color: T.sub,
                fontFamily: MX, fontSize: 10, fontWeight: 700,
              }}
            >
              TRAILING STOP
            </button>
          </div>

          <div style={{ ...row(6) }}>
            {[
              { val: "20", label: "TRAIL %" },
              { val: "60", label: "JARAK" },
              { val: "0", label: "OFFSET" },
            ].map((item) => (
              <div key={item.label} style={{
                flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 7,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: T.main }}>{item.val}</div>
                <div style={{ fontSize: 8, color: T.mute, marginTop: 2, letterSpacing: "0.06em" }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...row(8), alignItems: "center" }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: autoOn ? C.green : "rgba(255,255,255,0.15)",
              boxShadow: autoOn ? `0 0 8px ${C.green}` : "none",
            }} />
            <span style={{ fontSize: 9, color: T.dim, lineHeight: 1.4 }}>
              Eksekusi sinyal agen otomatis saat kondisi market sesuai
            </span>
          </div>

          <SliderField
            label="Alokasi Posisi"
            hint="Persentase kapasitas modal untuk posisi baru."
            value={allocPct}
            onChange={setAllocPct}
            min={10}
            max={100}
            step={5}
            format={(v) => `${v}%`}
            accent={C.purple}
          />

          <div style={{ ...row(5) }}>
            {(["NORMAL", "SMART", "OCA"] as const).map((m) => (
              <PillButton
                key={m}
                label={m}
                active={riskMode === m}
                onClick={() => setRiskMode(m)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. LOG PERFORMA ─────────────────────────────────────────────── */}
      <div style={{ padding: "12px 14px 16px", borderTop: D, flex: 1 }}>
        <SectionHeader
          icon="⚡"
          title="Log Performa"
          subtitle="Statistik historis sinyal tersimpan"
        />

        <div style={{ ...CARD, padding: 12, ...col(8) }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ textAlign: "center", padding: "10px 6px", borderRadius: 8, background: "rgba(0,212,232,0.06)" }}>
              <span style={{ fontSize: 9, color: T.dim }}>KECEPATAN SINYAL</span>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.cyan, marginTop: 4 }}>
                {signals.length > 0 ? `${signals.length}/s` : "—"}
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "10px 6px", borderRadius: 8, background: "rgba(249,115,22,0.06)" }}>
              <span style={{ fontSize: 9, color: T.dim }}>VALIDASI WR</span>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.orange, marginTop: 4 }}>
                {closed > 0 ? `${wr}%` : "—"}
              </div>
            </div>
          </div>

          <div style={col(4)}>
            <StatRow label="MENANG" value={win.toString()} color={C.green} />
            <StatRow label="KALAH" value={loss.toString()} color={C.red} />
            <StatRow label="AKTIF" value={active.length.toString()} color={C.cyan} />
            <StatRow label="SELESAI" value={closed.toString()} color={T.sub} />
          </div>

          <button
            type="button"
            aria-label="Hapus riwayat sinyal"
            style={{
              width: "100%", padding: "9px 0", borderRadius: 8, cursor: "pointer",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)", color: T.dim,
              fontFamily: MX, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            }}
          >
            HAPUS RIWAYAT
          </button>
        </div>
      </div>
    </aside>
  );
}