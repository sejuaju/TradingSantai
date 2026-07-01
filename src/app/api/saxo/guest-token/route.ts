/**
 * /api/saxo/guest-token — access token demo untuk pengunjung tanpa login Saxo.
 */

import { NextResponse } from "next/server";
import {
  getDemoRefreshToken,
  setDemoRefreshToken,
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
} | null> {
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
    console.error("[GuestToken] Refresh gagal:", res.status, body.substring(0, 200));
    return null;
  }

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresIn: (data.expires_in ?? 1200) as number,
  };
}

async function fetchFreshAccessToken(): Promise<{ accessToken: string } | null> {
  const release = await acquireDemoRefreshLock();
  try {
    // Baca ulang dari Redis — instance lain mungkin sudah rotate token
    const refreshToken = await getDemoRefreshToken();
    if (!refreshToken) return null;

    const data = await exchangeRefreshToken(refreshToken);
    if (!data) return null;

    if (data.refreshToken && data.refreshToken !== refreshToken) {
      await setDemoRefreshToken(data.refreshToken);
    }

    cachedAccess = {
      accessToken: data.accessToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
    };

    console.log(`[GuestToken] Access token di-refresh, valid ~${data.expiresIn}s`);
    return { accessToken: data.accessToken };
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
        hint: "Set SAXO_DEMO_REFRESH_TOKEN + connect Upstash Redis di Vercel, lalu redeploy",
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
          hint: "Login Saxo sekali, copy refresh_token baru ke SAXO_DEMO_REFRESH_TOKEN, redeploy",
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