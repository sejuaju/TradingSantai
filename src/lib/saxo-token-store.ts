/**
 * Penyimpanan refresh token demo Saxo (Vercel KV + fallback)
 * Versi lebih aman untuk serverless environment
 */

import { readDemoToken, saveDemoToken } from "./saxo-demo-token";

const KV_KEY = "saxo:demo:refresh_token";
const MEMORY_TTL_MS = 45_000; // 45 detik — cukup aman + tidak terlalu sering hit KV

interface CachedToken {
  token: string;
  updatedAt: number;
}

let memoryCache: CachedToken | null = null;

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// ==================== KV Helpers ====================

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
    console.log("[TokenStore] ✅ Refresh token berhasil disimpan ke KV");
    return true;
  } catch (err) {
    console.error("[TokenStore] ❌ KV write failed:", err);
    return false;
  }
}

// ==================== Public Functions ====================

/** Ambil refresh token demo terbaru (dengan cache + TTL) */
export async function getDemoRefreshToken(): Promise<string | null> {
  const now = Date.now();

  // Gunakan memory cache kalau masih valid
  if (memoryCache && now - memoryCache.updatedAt < MEMORY_TTL_MS) {
    return memoryCache.token;
  }

  // Memory cache expired → cek KV dulu
  const fromKv = await kvGet();
  if (fromKv) {
    memoryCache = { token: fromKv, updatedAt: now };
    return fromKv;
  }

  // Fallback ke file (localhost)
  const fromFile = readDemoToken();
  if (fromFile?.refreshToken) {
    memoryCache = { token: fromFile.refreshToken, updatedAt: now };
    return fromFile.refreshToken;
  }

  // Fallback terakhir ke environment variable
  const fromEnv = process.env.SAXO_DEMO_REFRESH_TOKEN;
  if (fromEnv) {
    memoryCache = { token: fromEnv, updatedAt: now };
    return fromEnv;
  }

  return null;
}

/** Simpan refresh token baru (setelah Saxo rotate) */
export async function setDemoRefreshToken(token: string): Promise<void> {
  const now = Date.now();

  // Update memory cache
  memoryCache = { token, updatedAt: now };

  // Simpan ke KV (prioritas utama)
  const savedToKv = await kvSet(token);
  if (savedToKv) {
    return;
  }

  // Fallback ke file (hanya untuk localhost development)
  try {
    saveDemoToken(token);
    console.log("[TokenStore] Refresh token disimpan ke file (localhost)");
  } catch {
    console.warn("[TokenStore] Gagal menyimpan token ke file juga.");
  }
}

export function isDemoRefreshConfigured(): boolean {
  if (memoryCache) return true;
  if (readDemoToken() !== null) return true;
  if (process.env.SAXO_DEMO_REFRESH_TOKEN) return true;
  if (hasKv()) return true;
  return false;
}
