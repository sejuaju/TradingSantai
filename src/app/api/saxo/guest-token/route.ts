/**
 * /api/saxo/guest-token — access token demo untuk pengunjung tanpa login Saxo.
 */

import { NextResponse } from "next/server";
import {
  getDemoRefreshToken,
  setDemoRefreshToken,
  isDemoRefreshConfigured,
} from "@/lib/saxo-token-store";

const IS_LIVE = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT === "LIVE";
const SAXO_AUTH_URL = IS_LIVE
  ? "https://live.logonvalidation.net"
  : "https://sim.logonvalidation.net";

const CACHE_BUFFER_MS = 120_000; // refresh Saxo hanya ~2 menit sebelum access token habis

let cachedAccess: { accessToken: string; expiresAt: number } | null = null;
let refreshInFlight: Promise<{ accessToken: string } | null> | null = null;

async function fetchFreshAccessToken(): Promise<{ accessToken: string } | null> {
  const refreshToken = await getDemoRefreshToken();
  if (!refreshToken) return null;

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

  if (data.refresh_token && data.refresh_token !== refreshToken) {
    await setDemoRefreshToken(data.refresh_token);
  }

  const accessToken = data.access_token as string;
  cachedAccess = {
    accessToken,
    expiresAt: Date.now() + (data.expires_in ?? 1200) * 1000,
  };

  console.log(`[GuestToken] Access token di-refresh, valid ~${data.expires_in ?? 1200}s`);
  return { accessToken };
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
  const configured = isDemoRefreshConfigured();
  if (!configured) {
    return NextResponse.json(
      {
        error: "Demo token belum dikonfigurasi",
        hint: "Set SAXO_DEMO_REFRESH_TOKEN di Vercel + aktifkan Vercel KV, atau login sekali di localhost",
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
          hint: "Login ulang Saxo, update SAXO_DEMO_REFRESH_TOKEN, pastikan Vercel KV aktif",
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
  const configured = isDemoRefreshConfigured();
  return new NextResponse(null, {
    status: configured ? 200 : 503,
    headers: { "x-demo-configured": configured ? "true" : "false" },
  });
}