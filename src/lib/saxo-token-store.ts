/**
 * Penyimpanan refresh token demo Saxo — shared antar instance serverless.
 *
 * Prioritas baca:
 *   1. Vercel KV (production — token rotate otomatis tersimpan)
 *   2. File .saxo-demo-token.json (localhost)
 *   3. Env SAXO_DEMO_REFRESH_TOKEN (seed awal)
 *
 * Tanpa KV di Vercel, banyak instance akan saling invalidasi token Saxo
 * karena setiap refresh memutar refresh_token.
 */

import { readDemoToken, saveDemoToken } from "./saxo-demo-token";

const KV_KEY = "saxo:demo:refresh_token";

/** Cache per warm instance — mengurangi hit KV */
let memoryRefreshToken: string | null = null;

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvGet(): Promise<string | null> {
  if (!hasKv()) return null;
  try {
    const { kv } = await import("@vercel/kv");
    const value = await kv.get<string>(KV_KEY);
    return value ?? null;
  } catch (err) {
    console.warn("[TokenStore] KV read failed:", err);
    return null;
  }
}

async function kvSet(token: string): Promise<boolean> {
  if (!hasKv()) return false;
  try {
    const { kv } = await import("@vercel/kv");
    await kv.set(KV_KEY, token);
    return true;
  } catch (err) {
    console.warn("[TokenStore] KV write failed:", err);
    return false;
  }
}

/** Ambil refresh token demo terbaru. */
export async function getDemoRefreshToken(): Promise<string | null> {
  if (memoryRefreshToken) return memoryRefreshToken;

  const fromKv = await kvGet();
  if (fromKv) {
    memoryRefreshToken = fromKv;
    return fromKv;
  }

  const fromFile = readDemoToken();
  if (fromFile?.refreshToken) {
    memoryRefreshToken = fromFile.refreshToken;
    return fromFile.refreshToken;
  }

  const fromEnv = process.env.SAXO_DEMO_REFRESH_TOKEN;
  if (fromEnv) {
    memoryRefreshToken = fromEnv;
    return fromEnv;
  }

  return null;
}

/** Simpan refresh token baru setelah Saxo rotate. */
export async function setDemoRefreshToken(token: string): Promise<void> {
  memoryRefreshToken = token;

  const savedKv = await kvSet(token);
  if (savedKv) {
    console.log("[TokenStore] Refresh token disimpan ke KV");
    return;
  }

  try {
    saveDemoToken(token);
    console.log("[TokenStore] Refresh token disimpan ke file");
  } catch {
    console.warn(
      "[TokenStore] Tidak bisa persist token — setup Vercel KV atau update SAXO_DEMO_REFRESH_TOKEN"
    );
  }
}

export function isDemoRefreshConfigured(): boolean {
  if (memoryRefreshToken) return true;
  if (readDemoToken() !== null) return true;
  if (process.env.SAXO_DEMO_REFRESH_TOKEN) return true;
  if (hasKv()) return true;
  return false;
}