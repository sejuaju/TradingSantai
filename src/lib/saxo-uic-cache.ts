/**
 * Saxo UIC Cache Manager
 * Handles dynamic UIC lookup with localStorage caching
 * Following Saxo best practices for instrument search
 */

interface UICCacheEntry {
  uic: number;
  assetType: string;
  symbol: string;
  description: string;
  timestamp: number;
}

interface UICCache {
  [instrumentId: string]: UICCacheEntry;
}

const CACHE_KEY = "saxo_uic_cache";
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Get UIC from cache
 */
export function getUICFromCache(instrumentId: string): UICCacheEntry | null {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    if (!cacheStr) return null;

    const cache: UICCache = JSON.parse(cacheStr);
    const entry = cache[instrumentId];

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      console.log(`[UIC Cache] Entry expired for ${instrumentId}`);
      return null;
    }

    console.log(`[UIC Cache] Hit for ${instrumentId}: UIC ${entry.uic}`);
    return entry;
  } catch (error) {
    console.error("[UIC Cache] Error reading cache:", error);
    return null;
  }
}

/**
 * Save UIC to cache
 */
export function saveUICToCache(
  instrumentId: string,
  uic: number,
  assetType: string,
  symbol: string,
  description: string
): void {
  try {
    const cacheStr = localStorage.getItem(CACHE_KEY);
    const cache: UICCache = cacheStr ? JSON.parse(cacheStr) : {};

    cache[instrumentId] = {
      uic,
      assetType,
      symbol,
      description,
      timestamp: Date.now(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(`[UIC Cache] Saved ${instrumentId}: UIC ${uic}`);
  } catch (error) {
    console.error("[UIC Cache] Error saving to cache:", error);
  }
}

/**
 * Clear entire cache
 */
export function clearUICCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log("[UIC Cache] Cache cleared");
  } catch (error) {
    console.error("[UIC Cache] Error clearing cache:", error);
  }
}

/**
 * Search UIC via Saxo API with auto-caching
 */
export async function searchAndCacheUIC(
  instrumentId: string,
  keywords: string,
  assetType: string,
  accessToken: string
): Promise<UICCacheEntry | null> {
  try {
    console.log(`[UIC Search] Searching for ${instrumentId} (${keywords})`);

    const response = await fetch("/api/saxo/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accessToken,
        keywords,
        assetType,
        limit: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search API failed: ${response.status}`);
    }

    const data = await response.json();
    const instruments = data.instruments || [];

    // Futures types yang dihindari sebagai prioritas pertama
    // karena Chart API Saxo sering menolak UIC/CfdOnFutures mapping
    const FUTURES_TYPES = ['CfdOnFutures', 'ContractFutures'];

    // Prioritas: exact+non-futures > exact > partial+non-futures > tradable+non-futures > tradable > fallback
    const match =
      // 1. Exact symbol + bukan futures (paling ideal)
      instruments.find(
        (inst: { symbol: string; assetType: string }) =>
          inst.symbol.toUpperCase() === instrumentId.toUpperCase() &&
          !FUTURES_TYPES.includes(inst.assetType)
      ) ??
      // 2. Exact symbol (assetType apapun)
      instruments.find(
        (inst: { symbol: string }) =>
          inst.symbol.toUpperCase() === instrumentId.toUpperCase()
      ) ??
      // 3. Partial symbol + bukan futures
      instruments.find(
        (inst: { symbol: string; assetType: string }) =>
          inst.symbol.toUpperCase().includes(instrumentId.toUpperCase()) &&
          !FUTURES_TYPES.includes(inst.assetType)
      ) ??
      // 4. Tradable + bukan futures
      instruments.find(
        (inst: { tradable: boolean; assetType: string }) =>
          inst.tradable && !FUTURES_TYPES.includes(inst.assetType)
      ) ??
      // 5. Tradable apapun
      instruments.find((inst: { tradable: boolean }) => inst.tradable) ??
      // 6. Absolute fallback: hasil pertama
      instruments[0];

    if (!match) {
      console.warn(`[UIC Search] No instrument found for ${instrumentId} (0 results from Saxo API)`);
      return null;
    }

    // Save to cache
    const entry: UICCacheEntry = {
      uic: match.uic,
      assetType: match.assetType,
      symbol: match.symbol,
      description: match.description,
      timestamp: Date.now(),
    };

    saveUICToCache(instrumentId, entry.uic, entry.assetType, entry.symbol, entry.description);

    console.log(`[UIC Search] Found ${instrumentId}: UIC ${entry.uic}`);
    return entry;
  } catch (error) {
    console.error(`[UIC Search] Error searching ${instrumentId}:`, error);
    return null;
  }
}

/**
 * Return type for getUIC — membawa UIC + assetType nyata dari Saxo
 */
export interface UICResult {
  uic: number;
  assetType: string;
  symbol: string;
}

/**
 * Get UIC with auto-search and caching
 * Returns both UIC AND assetType dari Saxo — jangan gunakan assetType dari config
 */
export async function getUIC(
  instrumentId: string,
  keywords: string,
  assetType: string,
  accessToken: string
): Promise<UICResult | null> {
  // Try cache first
  const cached = getUICFromCache(instrumentId);
  if (cached) {
    return { uic: cached.uic, assetType: cached.assetType, symbol: cached.symbol };
  }

  // Cache miss - search via API
  console.log(`[UIC] Cache miss for ${instrumentId}, searching...`);
  const result = await searchAndCacheUIC(instrumentId, keywords, assetType, accessToken);

  return result
    ? { uic: result.uic, assetType: result.assetType, symbol: result.symbol }
    : null;
}
