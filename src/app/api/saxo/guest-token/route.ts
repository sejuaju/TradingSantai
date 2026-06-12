/**
 * /api/saxo/guest-token
 *
 * Mengambil access token untuk mode demo/guest — digunakan saat pengunjung
 * belum login dengan akun Saxo pribadi mereka.
 *
 * Sumber refresh token (prioritas):
 *  1. File .saxo-demo-token.json — auto-disimpan saat login pertama kali
 *  2. Env var SAXO_DEMO_REFRESH_TOKEN — fallback manual (opsional)
 *
 * Setup:
 *  Cukup login SEKALI dengan akun Saxo SIM kamu.
 *  Token disimpan otomatis, pengunjung langsung bisa lihat market data.
 */

import { NextResponse }                              from "next/server";
import { readDemoToken, saveDemoToken, isDemoTokenConfigured } from "@/lib/saxo-demo-token";

const IS_LIVE      = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT === "LIVE";
const SAXO_AUTH_URL = IS_LIVE
  ? "https://live.logonvalidation.net"
  : "https://sim.logonvalidation.net";

// ─── Server-side in-memory cache (persists selama server process berjalan) ───
let cachedToken: {
  accessToken: string;
  expiresAt:   number;
} | null = null;

export async function GET() {
  // 1. Return cached access token kalau masih valid (buffer 90 detik)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 90_000) {
    return NextResponse.json({ accessToken: cachedToken.accessToken, mode: "demo" });
  }

  // 2. Ambil refresh token — dari file (auto-saved) atau env var
  const stored       = readDemoToken();
  const refreshToken = stored?.refreshToken ?? process.env.SAXO_DEMO_REFRESH_TOKEN;

  if (!refreshToken) {
    return NextResponse.json(
      {
        error:  "Demo token belum dikonfigurasi",
        hint:   "Login sekali dengan akun Saxo untuk setup otomatis, atau set SAXO_DEMO_REFRESH_TOKEN di .env.local",
        configured: false,
      },
      { status: 503 }
    );
  }

  const appKey    = process.env.NEXT_PUBLIC_SAXO_APP_KEY;
  const appSecret = process.env.SAXO_APP_SECRET;

  if (!appKey || !appSecret) {
    return NextResponse.json(
      { error: "Saxo app credentials tidak dikonfigurasi" },
      { status: 503 }
    );
  }

  // 3. Exchange refresh token → access token
  try {
    const res = await fetch(`${SAXO_AUTH_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "refresh_token",
        refresh_token: refreshToken,
        client_id:     appKey,
        client_secret: appSecret,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[GuestToken] Refresh gagal:", res.status, body);

      return NextResponse.json(
        {
          error:   "Demo token kadaluarsa atau tidak valid",
          hint:    "Login ulang sekali dengan akun Saxo untuk memperbarui demo token",
          details: body.substring(0, 200),
        },
        { status: 401 }
      );
    }

    const data = await res.json();

    // 4. Update cache in-memory
    cachedToken = {
      accessToken: data.access_token,
      expiresAt:   Date.now() + (data.expires_in ?? 1200) * 1000,
    };

    // 5. Simpan refresh token baru ke file (Saxo rotate refresh token setiap use)
    if (data.refresh_token && data.refresh_token !== refreshToken) {
      try {
        saveDemoToken(data.refresh_token);
        console.log("[GuestToken] 🔄 Refresh token diperbarui di file");
      } catch (err) {
        console.warn("[GuestToken] Tidak bisa update file token:", err);
        // Tidak fatal — token lama mungkin masih berlaku beberapa saat
      }
    }

    console.log(`[GuestToken] ✅ Token di-refresh, expired in ${data.expires_in ?? 1200}s`);

    return NextResponse.json({ accessToken: cachedToken.accessToken, mode: "demo" });
  } catch (err) {
    console.error("[GuestToken] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal error saat mengambil demo token" },
      { status: 500 }
    );
  }
}

/** Cek status demo token — dipakai oleh UI setup indicator */
export async function HEAD() {
  const configured = isDemoTokenConfigured();
  return new NextResponse(null, {
    status: configured ? 200 : 503,
    headers: { "x-demo-configured": configured ? "true" : "false" },
  });
}
