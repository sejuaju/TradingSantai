"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthTrigger from "@/components/auth/AuthTrigger";
import { getAvatarUrl, getDisplayName, getInitials } from "@/lib/profile";
import { C, T } from "./shared";

const MX = "monospace";
const row = (gap = 0): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap,
});

function formatTraderId(userId: string): string {
  return `TS_${userId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

interface Props {
  returnPct: number;
}

export function ProfileMonitorHeader({ returnPct }: Props) {
  const { user, loading } = useAuth();

  const displayName = user ? getDisplayName(user) : "Guest";
  const avatarUrl = user ? getAvatarUrl(user) : null;
  const initials = getInitials(displayName);
  const traderId = user ? formatTraderId(user.id) : "—";
  const retColor = returnPct >= 0 ? C.green : C.red;
  const retSign = returnPct >= 0 ? "+" : "";

  return (
    <div style={{ ...row(0), justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
      <div style={{ ...row(8), minWidth: 0, flex: 1 }}>
        {loading ? (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              flexShrink: 0,
            }}
          />
        ) : avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid rgba(255,255,255,0.12)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: user
                ? `linear-gradient(135deg, ${C.purple}, ${C.cyan})`
                : "rgba(255,255,255,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: MX,
              fontSize: 10,
              fontWeight: 800,
              color: "white",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
        )}

        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: user ? C.cyan : T.sub,
              fontFamily: MX,
              letterSpacing: "0.04em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "..." : displayName}
          </span>
          {!loading && user && (
            <span
              style={{
                fontFamily: MX,
                fontSize: 9,
                color: T.dim,
                letterSpacing: "0.08em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.28)" }}>UID:</span> {traderId}
            </span>
          )}
          {!loading && !user && (
            <AuthTrigger
              mode="login"
              style={{
                fontFamily: MX,
                fontSize: 9,
                color: C.cyan,
                textDecoration: "none",
                letterSpacing: "0.06em",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              Login →
            </AuthTrigger>
          )}
        </div>
      </div>

      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          fontFamily: MX,
          color: retColor,
          textShadow: `0 0 10px ${retColor}55`,
          flexShrink: 0,
        }}
      >
        {retSign}
        {Math.abs(returnPct).toFixed(1)}%
      </span>
    </div>
  );
}