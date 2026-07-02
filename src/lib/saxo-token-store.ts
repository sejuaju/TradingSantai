/**
 * Penyimpanan refresh token demo Saxo — shared antar instance Vercel.
 *
 * Mendukung:
 *   - Vercel KV / Upstash: KV_REST_API_* atau UPSTASH_REDIS_REST_*
 *   - File .saxo-demo-token.json (localhost)
 *   - Env SAXO_DEMO_REFRESH_TOKEN (seed awal)
 */

import { readDemoToken, saveDemoToken } from "./saxo-demo-token";

const TOKEN_KEY = "saxo:demo:refresh_token";
const LOCK_KEY = "saxo:demo:refresh_lock";
const LOCK_TTL_SEC = 30;
const MEMORY_TTL_MS = 45_000;

interface CachedToken {
  token: string;
  updatedAt: number;
}

let memoryCache: CachedToken | null = null;

type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<unknown>;
  setnx?: (key: string, value: string, opts?: { ex: number }) => Promise<number | null>;
  del?: (key: string) => Promise<unknown>;
};

function envSeedToken(): string | null {
  const v = process.env.SAXO_DEMO_REFRESH_TOKEN?.trim();
  return v || null;
}

function hasRedisEnv(): boolean {
  return Boolean(
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

async function getRedis(): Promise<RedisClient | null> {
  if (!hasRedisEnv()) return null;

  // Upstash marketplace (paling umum di Vercel sekarang)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return {
        get: (key) => redis.get<string>(key),
        set: (key, value) => redis.set(key, value),
        setnx: async (key, value, opts) => {
          const ttl = opts?.ex ?? LOCK_TTL_SEC;
          const ok = await redis.set(key, value, { nx: true, ex: ttl });
          return ok === "OK" ? 1 : 0;
        },
        del: (key) => redis.del(key),
      };
    } catch (err) {
      console.warn("[TokenStore] Upstash init failed:", err);
    }
  }

  // Vercel KV legacy
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = await import("@vercel/kv");
      return {
        get: (key) => kv.get<string>(key),
        set: (key, value) => kv.set(key, value),
        del: (key) => kv.del(key),
      };
    } catch (err) {
      console.warn("[TokenStore] Vercel KV init failed:", err);
    }
  }

  return null;
}

async function redisGet(): Promise<string | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    return (await redis.get(TOKEN_KEY)) ?? null;
  } catch (err) {
    console.warn("[TokenStore] Redis read failed:", err);
    return null;
  }
}

async function redisDel(): Promise<void> {
  const redis = await getRedis();
  if (!redis?.del) return;
  try {
    await redis.del(TOKEN_KEY);
  } catch (err) {
    console.warn("[TokenStore] Redis delete failed:", err);
  }
}

async function redisSet(token: string): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;
  try {
    await redis.set(TOKEN_KEY, token);
    console.log("[TokenStore] Refresh token disimpan ke Redis/KV");
    return true;
  } catch (err) {
    console.error("[TokenStore] Redis write failed:", err);
    return false;
  }
}

/** Lock antar instance — cegah 2 serverless refresh token Saxo bersamaan */
export async function acquireDemoRefreshLock(): Promise<() => Promise<void>> {
  const redis = await getRedis();
  if (!redis?.setnx) {
    return async () => {};
  }

  const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  for (let i = 0; i < 20; i++) {
    const ok = await redis.setnx(LOCK_KEY, lockId, { ex: LOCK_TTL_SEC });
    if (ok === 1) {
      return async () => {
        try {
          const current = await redis.get(LOCK_KEY);
          if (current === lockId) await redis.del?.(LOCK_KEY);
        } catch { /* ignore */ }
      };
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  return async () => {};
}

export async function getDemoRefreshToken(): Promise<string | null> {
  const now = Date.now();

  if (memoryCache && now - memoryCache.updatedAt < MEMORY_TTL_MS) {
    return memoryCache.token;
  }

  const fromRedis = await redisGet();
  const fromEnv = envSeedToken();
  const fromFile = readDemoToken()?.refreshToken ?? null;

  // Redis = sumber kebenaran setelah rotasi Saxo. Env hanya seed awal jika Redis kosong.
  if (fromRedis) {
    memoryCache = { token: fromRedis, updatedAt: now };
    return fromRedis;
  }

  if (fromFile) {
    memoryCache = { token: fromFile, updatedAt: now };
    await redisSet(fromFile);
    return fromFile;
  }

  if (fromEnv) {
    memoryCache = { token: fromEnv, updatedAt: now };
    await redisSet(fromEnv);
    return fromEnv;
  }

  return null;
}

/** Hapus token stale di Redis/memory — dipakai saat Saxo menolak refresh */
export async function clearDemoRefreshToken(): Promise<void> {
  memoryCache = null;
  await redisDel();
}

/** Token seed dari env var (untuk recovery) */
export function getEnvDemoRefreshToken(): string | null {
  return envSeedToken();
}

export async function setDemoRefreshToken(token: string): Promise<void> {
  const now = Date.now();
  memoryCache = { token, updatedAt: now };

  const savedRedis = await redisSet(token);
  if (savedRedis) return;

  try {
    saveDemoToken(token);
    console.log("[TokenStore] Refresh token disimpan ke file (localhost)");
  } catch {
    console.warn("[TokenStore] Gagal persist — setup Upstash Redis di Vercel");
  }
}

export function isDemoRefreshConfigured(): boolean {
  if (memoryCache) return true;
  if (readDemoToken() !== null) return true;
  if (envSeedToken()) return true;
  return false;
}

export async function isDemoRefreshReady(): Promise<boolean> {
  if (isDemoRefreshConfigured()) return true;
  const fromRedis = await redisGet();
  return Boolean(fromRedis);
}