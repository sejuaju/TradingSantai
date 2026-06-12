"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { getAuthorizationUrl, isAuthenticated, clearTokens } from "@/lib/saxo-auth";

type DemoStatus = "checking" | "ready" | "not-configured";

// Subscribe untuk auth — listen ke storage events (cross-tab sync)
function subscribeToAuth(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function SaxoLoginButton() {
  // ── Mount detection via useSyncExternalStore ─────────────────────────────
  // Tidak butuh useState + useEffect → tidak ada setState-in-effect.
  //
  // Cara kerja:
  //   Server          : getServerSnapshot() → false
  //   Client hydration: getServerSnapshot() → false  ✓ MATCH dengan server
  //   Setelah hydrate : getSnapshot()       → true   → re-render sekali
  //
  // `mounted` menjamin `authenticated` false selama hydration,
  // sehingga HTML server dan client selalu cocok.
  const mounted = useSyncExternalStore(
    () => () => {},  // subscribe: no-op (mount adalah one-time event)
    () => true,      // client snapshot: selalu true setelah hydration
    () => false,     // server snapshot: selalu false di server
  );

  // Auth state — hanya aktif setelah mounted untuk cegah hydration mismatch
  const authSnap = useSyncExternalStore(
    subscribeToAuth,
    () => isAuthenticated(),
    () => false,
  );

  const authenticated = mounted && authSnap;

  // Demo status — setDemoStatus dipanggil di .then() (bukan synchronous di body effect)
  // → tidak melanggar react-hooks/set-state-in-effect
  const [demoStatus, setDemoStatus] = useState<DemoStatus>("checking");

  useEffect(() => {
    fetch("/api/saxo/guest-token", { method: "HEAD" })
      .then((res) => setDemoStatus(res.ok ? "ready" : "not-configured"))
      .catch(()   => setDemoStatus("not-configured"));
  }, []);

  const handleLogin = () => {
    const authUrl = getAuthorizationUrl();
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    clearTokens();
    window.location.reload();
  };

  // ── Sudah login pribadi ───────────────────────────────────────────────────
  if (authenticated) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 6,
          background: "rgba(34,197,94,0.12)",
          border: "1px solid rgba(34,197,94,0.25)",
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#4ade80", boxShadow: "0 0 10px #4ade80",
          }} />
          <span style={{
            fontFamily: "monospace", fontSize: 10, fontWeight: 700,
            color: "#4ade80", letterSpacing: "0.08em",
          }}>
            SAXO CONNECTED
          </span>
        </div>
        <button onClick={handleLogout} style={{
          padding: "6px 12px", borderRadius: 6,
          border: "1px solid rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.12)",
          color: "#f87171", fontFamily: "monospace",
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          cursor: "pointer",
        }}>
          DISCONNECT
        </button>
      </div>
    );
  }

  // ── Belum login ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {demoStatus === "ready" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px", borderRadius: 4,
          background: "rgba(168,85,247,0.10)",
          border: "1px solid rgba(168,85,247,0.2)",
        }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "#a855f7", boxShadow: "0 0 6px #a855f7",
          }} />
          <span style={{
            fontFamily: "monospace", fontSize: 9, fontWeight: 700,
            color: "#c084fc", letterSpacing: "0.08em",
          }}>
            DEMO
          </span>
        </div>
      )}

      {demoStatus === "not-configured" && (
        <span style={{
          fontFamily: "monospace", fontSize: 9,
          color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em",
        }}>
          login untuk setup
        </span>
      )}

      <button
        onClick={handleLogin}
        title={
          demoStatus === "not-configured"
            ? "Login sekali untuk mengaktifkan demo mode — pengunjung bisa lihat market data tanpa login"
            : "Login dengan akun Saxo untuk melihat data akun pribadi"
        }
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "7px 14px", borderRadius: 7,
          border: "1px solid rgba(0,169,224,0.3)",
          background: demoStatus === "not-configured"
            ? "rgba(0,169,224,0.18)"
            : "rgba(0,169,224,0.10)",
          color: "#00a9e0",
          fontFamily: "monospace", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.08em", cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0,169,224,0.25)";
          e.currentTarget.style.transform  = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = demoStatus === "not-configured"
            ? "rgba(0,169,224,0.18)"
            : "rgba(0,169,224,0.10)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        <span>
          {demoStatus === "not-configured" ? "SETUP & LOGIN" : "LOGIN SAXO"}
        </span>
      </button>
    </div>
  );
}