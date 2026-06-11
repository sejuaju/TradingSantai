"use client";

import { useSyncExternalStore } from "react";
import { getAuthorizationUrl, isAuthenticated, clearTokens } from "@/lib/saxo-auth";

// useSyncExternalStore membutuhkan subscribe function.
// Tidak ada external subscription untuk localStorage, tapi tetap diperlukan
// sebagai parameter — kembalikan no-op unsubscribe.
function subscribe() {
  return () => {};
}

export function SaxoLoginButton() {
  // FIX: Gunakan useSyncExternalStore — solusi resmi React untuk membaca
  // external store (termasuk localStorage) dengan SSR/hydration yang benar.
  //
  // Cara kerjanya:
  //   Server          → pakai getServerSnapshot() → false → render <button>
  //   Client hydrate  → pakai getServerSnapshot() → false → render <button> ✓ (match!)
  //   Setelah hydrate → pakai getSnapshot()       → cek localStorage → re-render jika perlu
  //
  // Tidak ada hydration mismatch, tidak ada setState-in-effect.
  const authenticated = useSyncExternalStore(
    subscribe,
    () => isAuthenticated(), // client snapshot: cek localStorage
    () => false,             // server snapshot: selalu false (localStorage tidak ada di server)
  );

  const handleLogin = () => {
    const authUrl = getAuthorizationUrl();
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    clearTokens();
    window.location.reload();
  };

  if (authenticated) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 6,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.25)",
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#4ade80",
              boxShadow: "0 0 10px #4ade80",
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 700,
              color: "#4ade80",
              letterSpacing: "0.08em",
            }}
          >
            SAXO CONNECTED
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.12)",
            color: "#f87171",
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(239,68,68,0.25)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "rgba(239,68,68,0.12)";
          }}
        >
          DISCONNECT
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px solid rgba(0,169,224,0.3)",
        background: "rgba(0,169,224,0.12)",
        color: "#00a9e0",
        fontFamily: "monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(0,169,224,0.25)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          "rgba(0,169,224,0.12)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      <span>LOGIN WITH SAXO</span>
    </button>
  );
}