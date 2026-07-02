/**
 * Saxo Bank OAuth 2.0 Authentication Module
 * Handles login, token management, and API authentication
 */

export interface SaxoTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
  base_uri?: string;
}

export interface SaxoAuthConfig {
  appKey: string;
  appSecret: string;
  environment: "SIM" | "LIVE";
  redirectUri: string;
}

// ─── Environment-based URLs ───────────────────────────────────────────────────
function getAuthUrl(environment: "SIM" | "LIVE"): string {
  return environment === "SIM"
    ? "https://sim.logonvalidation.net"
    : "https://live.logonvalidation.net";
}

function getApiUrl(environment: "SIM" | "LIVE"): string {
  return environment === "SIM"
    ? "https://gateway.saxobank.com/sim/openapi"
    : "https://gateway.saxobank.com/openapi";
}

function getStreamUrl(environment: "SIM" | "LIVE"): string {
  return environment === "SIM"
    ? "wss://streaming.saxobank.com/sim/openapi"
    : "wss://streaming.saxobank.com/openapi";
}

/** Redirect URI — di browser selalu pakai origin saat ini (Vercel / localhost). */
export function getSaxoRedirectUri(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  return process.env.NEXT_PUBLIC_SAXO_REDIRECT_URI || "http://localhost:3000/auth/callback";
}

// ─── Get Configuration from Environment ───────────────────────────────────────
export function getSaxoConfig(): SaxoAuthConfig {
  const appKey = process.env.NEXT_PUBLIC_SAXO_APP_KEY;
  const appSecret = process.env.SAXO_APP_SECRET;
  const environment = (process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT || "SIM") as "SIM" | "LIVE";
  const redirectUri = getSaxoRedirectUri();

  if (!appKey) {
    throw new Error("NEXT_PUBLIC_SAXO_APP_KEY is not configured");
  }

  return {
    appKey,
    appSecret: appSecret || "",
    environment,
    redirectUri,
  };
}

// ─── Generate Authorization URL ───────────────────────────────────────────────
export function getAuthorizationUrl(): string {
  const config = getSaxoConfig();
  const authUrl = getAuthUrl(config.environment);
  
  // Generate random state for CSRF protection
  const state = generateRandomString(32);
  
  // Store state in sessionStorage for verification
  if (typeof window !== "undefined") {
    sessionStorage.setItem("saxo_oauth_state", state);
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.appKey,
    redirect_uri: config.redirectUri,
    state: state,
  });

  return `${authUrl}/authorize?${params.toString()}`;
}

// ─── Exchange Authorization Code for Tokens ───────────────────────────────────
export async function exchangeCodeForTokens(code: string): Promise<SaxoTokens> {
  const config = getSaxoConfig();

  // Call our Next.js API route (server-side) to avoid CORS
  const response = await fetch("/api/saxo/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error || error.message || "Unknown error"}`);
  }

  const tokens: SaxoTokens = await response.json();

  // Refresh token sudah disimpan ke Redis oleh /api/saxo/token.
  // Jangan simpan di localStorage — semua user memakai guest token server.
  if (typeof window !== "undefined") {
    clearTokens();
  }

  return tokens;
}

// ─── Refresh Access Token ─────────────────────────────────────────────────────
export async function refreshAccessToken(refreshToken: string): Promise<SaxoTokens> {
  // Call our Next.js API route for refresh (server-side)
  const response = await fetch("/api/saxo/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${error.error || error.message || "Unknown error"}`);
  }

  const tokens: SaxoTokens = await response.json();
  return tokens;
}

// ─── Get Stored Tokens ────────────────────────────────────────────────────────
export function getStoredTokens(): SaxoTokens | null {
  if (typeof window === "undefined") return null;

  const tokensStr = localStorage.getItem("saxo_tokens");
  if (!tokensStr) return null;

  try {
    return JSON.parse(tokensStr) as SaxoTokens;
  } catch {
    return null;
  }
}

// ─── Check if Token is Expired ────────────────────────────────────────────────
export function isTokenExpired(): boolean {
  if (typeof window === "undefined") return true;

  const tokens = getStoredTokens();
  if (!tokens) return true;

  const timestamp = localStorage.getItem("saxo_token_timestamp");
  if (!timestamp) return true;

  const tokenAge = Date.now() - parseInt(timestamp);
  const expiresIn = tokens.expires_in * 1000; // Convert to milliseconds

  // Refresh if token will expire in next 5 minutes
  return tokenAge >= expiresIn - 300000;
}

// ─── Refresh Token dengan Lock (cegah race condition refresh-token-rotation) ──
// Saxo me-rotate refresh_token setiap kali dipakai. Kalau 2 pemanggil me-refresh
// BERSAMAAN dengan refresh_token yang sama, salah satu akan ditolak Saxo (token
// sudah "dibakar" oleh pemanggil lain). Lock module-level ini memastikan hanya
// SATU request refresh yang benar-benar jalan; pemanggil lain menunggu dan
// memakai hasil yang sama.
let refreshInFlight: Promise<SaxoTokens> | null = null;

async function refreshAccessTokenLocked(refreshToken: string): Promise<SaxoTokens> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = refreshAccessToken(refreshToken).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// ─── Get Valid Access Token ───────────────────────────────────────────────────
export async function getValidAccessToken(): Promise<string | null> {
  return getAccessToken();
}

// ─── Clear Stored Tokens (logout) ─────────────────────────────────────────────
export function clearTokens(): void {
  if (typeof window === "undefined") return;
  
  localStorage.removeItem("saxo_tokens");
  localStorage.removeItem("saxo_token_timestamp");
}

// ─── Check if User is Authenticated ───────────────────────────────────────────
export function isAuthenticated(): boolean {
  return getStoredTokens() !== null;
}

// ─── Get API URLs ─────────────────────────────────────────────────────────────
export function getSaxoApiUrls() {
  const config = getSaxoConfig();
  return {
    api: getApiUrl(config.environment),
    stream: getStreamUrl(config.environment),
    auth: getAuthUrl(config.environment),
  };
}

// ─── Helper: Generate Random String ───────────────────────────────────────────
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ─── Make Authenticated API Request ───────────────────────────────────────────
export async function saxoFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getValidAccessToken();
  
  if (!token) {
    throw new Error("Not authenticated. Please login first.");
  }

  const { api } = getSaxoApiUrls();
  const url = endpoint.startsWith("http") ? endpoint : `${api}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // Handle 401 (token expired)
  if (response.status === 401) {
    // Try to refresh token once
    const tokens = getStoredTokens();
    if (tokens) {
      try {
        await refreshAccessToken(tokens.refresh_token);
        // Retry request with new token
        return saxoFetch(endpoint, options);
      } catch {
        clearTokens();
        throw new Error("Session expired. Please login again.");
      }
    }
  }

  return response;
}

const DEMO_CACHE_KEY = "saxo_demo_access_cache";

function readDemoAccessCache(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DEMO_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { token: string; expiresAt: number };
    if (cached.token && Date.now() < cached.expiresAt - 60_000) {
      return cached.token;
    }
  } catch { /* ignore */ }
  return null;
}

function writeDemoAccessCache(accessToken: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    DEMO_CACHE_KEY,
    JSON.stringify({
      token: accessToken,
      expiresAt: Date.now() + 1_100_000,
    }),
  );
}

export function clearDemoAccessCache(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DEMO_CACHE_KEY);
}

/**
 * getAccessToken
 *
 * Selalu memakai guest/demo token dari server (Redis).
 * Admin login Saxo sekali untuk seed refresh token; semua pengunjung
 * memakai access token yang sama tanpa login Saxo sendiri.
 */
export async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const cached = readDemoAccessCache();
  if (cached) return cached;

  try {
    const res = await fetch("/api/saxo/guest-token");
    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) {
        writeDemoAccessCache(data.accessToken);
        return data.accessToken;
      }
    }
    clearDemoAccessCache();
  } catch {
    clearDemoAccessCache();
  }

  return null;
}
