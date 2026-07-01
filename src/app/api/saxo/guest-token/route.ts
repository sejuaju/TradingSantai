/**
 * /api/saxo/guest-token — access token demo untuk pengunjung tanpa login Saxo.
 */

import { NextResponse } from "next/server";
import {
  getDemoRefreshToken,
  setDemoRefreshToken,
  clearDemoRefreshToken,
  getEnvDemoRefreshToken,
  isDemoRefreshReady,
  acquireDemoRefreshLock,
} from "@/lib/saxo-token-store";

const IS_LIVE = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT === "LIVE";
const SAXO_AUTH_URL = IS_LIVE
  ? "https://live.logonvalidation.net"
  : "https://sim.logonvalidation.net";

const CACHE_BUFFER_MS = 120_000;

let cachedAccess: { accessToken: string; expiresAt: number } | null = null;
let refreshInFlight: Promise<{ accessToken: string } | null> | null = null;

async function exchangeRefreshToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
} | { error: string } | null> {
  const appKey = process.env.NEXT_PUBLIC_SAXO_APP_KEY;
  const appSecret = process.env.SAXO_APP_SECRET;
  if (!appKey || !appSecret) return null;

  const res = await fetch(`${SAXO_AUTH_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: appKey,
      client_secret: appSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[GuestToken] Refresh gagal:", res.status, body.substring(0, 300));
    return { error: body.substring(0, 300) };
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresIn: (data.expires_in ?? 1200) as number,
  };
}

async function tryRefreshWithToken(refreshToken: string) {
  const result = await exchangeRefreshToken(refreshToken);
  if (!result || "error" in result) return { ok: false as const, error: result?.error ?? "unknown" };

  if (result.refreshToken && result.refreshToken !== refreshToken) {
    await setDemoRefreshToken(result.refreshToken);
  }

  cachedAccess = {
    accessToken: result.accessToken,
    expiresAt: Date.now() + result.expiresIn * 1000,
  };

  return { ok: true as const, accessToken: result.accessToken };
}

async function fetchFreshAccessToken(): Promise<{ accessToken: string } | null> {
  const release = await acquireDemoRefreshLock();
  try {
    let refreshToken = await getDemoRefreshToken();
    if (!refreshToken) return null;

    let attempt = await tryRefreshWithToken(refreshToken);
    if (attempt.ok) {
      console.log("[GuestToken] Access token di-refresh");
      return { accessToken: attempt.accessToken };
    }

    // Redis mungkin menyimpan token stale — coba seed dari env
    const envToken = getEnvDemoRefreshToken();
    if (envToken && envToken !== refreshToken) {
      console.warn("[GuestToken] Retry dengan SAXO_DEMO_REFRESH_TOKEN dari env...");
      await clearDemoRefreshToken();
      await setDemoRefreshToken(envToken);
      attempt = await tryRefreshWithToken(envToken);
      if (attempt.ok) {
        console.log("[GuestToken] Recovery berhasil via env seed");
        return { accessToken: attempt.accessToken };
      }
    }

    // Token di Redis & env sama-sama ditolak Saxo — hapus Redis agar login ulang bisa seed
    if (envToken) {
      await clearDemoRefreshToken();
      attempt = await tryRefreshWithToken(envToken);
      if (attempt.ok) {
        return { accessToken: attempt.accessToken };
      }
    }

    console.error("[GuestToken] Semua percobaan refresh gagal — perlu refresh_token baru dari login Saxo");
    return null;
  } finally {
    await release();
  }
}

function getCachedAccess(): string | null {
  if (!cachedAccess) return null;
  if (Date.now() >= cachedAccess.expiresAt - CACHE_BUFFER_MS) return null;
  return cachedAccess.accessToken;
}

async function getDemoAccessToken(): Promise<{ accessToken: string } | null> {
  const hit = getCachedAccess();
  if (hit) return { accessToken: hit };

  if (!refreshInFlight) {
    refreshInFlight = fetchFreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function GET() {
  const ready = await isDemoRefreshReady();
  if (!ready) {
    return NextResponse.json(
      {
        error: "Demo token belum dikonfigurasi",
        hint: "Set SAXO_DEMO_REFRESH_TOKEN + connect Upstash Redis, lalu redeploy",
        configured: false,
      },
      { status: 503 },
    );
  }

  try {
    const result = await getDemoAccessToken();
    if (!result) {
      return NextResponse.json(
        {
          error: "Demo token kadaluarsa atau tidak valid",
          hint:
            "1) Login Saxo sekali di situs ini (tombol LOGIN) untuk seed otomatis, ATAU " +
            "2) Copy refresh_token baru ke SAXO_DEMO_REFRESH_TOKEN lalu restart/redeploy, ATAU " +
            "3) Hapus key 'saxo:demo:refresh_token' di Upstash lalu redeploy",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({ accessToken: result.accessToken, mode: "demo" });
  } catch (err) {
    console.error("[GuestToken] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal error saat mengambil demo token" },
      { status: 500 },
    );
  }
}

export async function HEAD() {
  const ready = await isDemoRefreshReady();
  return new NextResponse(null, {
    status: ready ? 200 : 503,
    headers: {
      "x-demo-configured": ready ? "true" : "false",
      "x-redis-connected": (
        Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)
      ) ? "true" : "false",
    },
  });
}