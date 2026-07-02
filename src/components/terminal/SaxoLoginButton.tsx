"use client";

import { useState, useEffect } from "react";
import { getAuthorizationUrl } from "@/lib/saxo-auth";
import { isSaxoSetupModeEnabled } from "@/lib/saxoSetup";

type DemoStatus = "checking" | "ready" | "not-configured";

export function SaxoLoginButton() {
  const [demoStatus, setDemoStatus] = useState<DemoStatus>("checking");
  const [setupMode, setSetupMode] = useState(false);

  useEffect(() => {
    setSetupMode(isSaxoSetupModeEnabled());

    fetch("/api/saxo/guest-token", { method: "HEAD" })
      .then((res) => setDemoStatus(res.ok ? "ready" : "not-configured"))
      .catch(() => setDemoStatus("not-configured"));
  }, []);

  const handleLogin = () => {
    const authUrl = getAuthorizationUrl();
    window.location.href = authUrl;
  };

  const showSetupButton =
    demoStatus === "not-configured" || (demoStatus === "ready" && setupMode);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {demoStatus === "ready" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            borderRadius: 4,
            background: "rgba(168,85,247,0.10)",
            border: "1px solid rgba(168,85,247,0.2)",
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#a855f7",
              boxShadow: "0 0 6px #a855f7",
            }}
          />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: 700,
              color: "#c084fc",
              letterSpacing: "0.08em",
            }}
          >
            LIVE DATA
          </span>
        </div>
      )}

      {demoStatus === "not-configured" && !showSetupButton && (
        <span
          style={{
            fontFamily: "monospace",
            fontSize: 9,
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.04em",
          }}
        >
          data market belum aktif
        </span>
      )}

      {showSetupButton && (
        <button
          onClick={handleLogin}
          title={
            demoStatus === "not-configured"
              ? "Login Saxo sekali (admin) untuk mengaktifkan data market bagi semua pengunjung"
              : "Perbarui refresh token Saxo di server (admin)"
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 14px",
            borderRadius: 7,
            border: "1px solid rgba(0,169,224,0.3)",
            background:
              demoStatus === "not-configured"
                ? "rgba(0,169,224,0.18)"
                : "rgba(0,169,224,0.10)",
            color: "#00a9e0",
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,169,224,0.25)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              demoStatus === "not-configured"
                ? "rgba(0,169,224,0.18)"
                : "rgba(0,169,224,0.10)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <svg
            width="13"
            height="13"
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
          <span>
            {demoStatus === "not-configured" ? "SETUP SAXO (ADMIN)" : "REFRESH SAXO (ADMIN)"}
          </span>
        </button>
      )}
    </div>
  );
}