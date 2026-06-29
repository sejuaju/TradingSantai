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
  
  // Store tokens in localStorage (in production, use httpOnly cookies!)
  if (typeof window !== "undefined") {
    localStorage.setItem("saxo_tokens", JSON.stringify(tokens));
    localStorage.setItem("saxo_token_timestamp", Date.now().toString());
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
  
  // Update stored tokens
  if (typeof window !== "undefined") {
    localStorage.setItem("saxo_tokens", JSON.stringify(tokens));
    localStorage.setItem("saxo_token_timestamp", Date.now().toString());
  }

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

// ─── Get Valid Access Token (auto-refresh if needed) ──────────────────────────
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();
  if (!tokens) return null;

  // Check if token needs refresh
  if (isTokenExpired()) {
    try {
      const newTokens = await refreshAccessTokenLocked(tokens.refresh_token);
      return newTokens.access_token;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      // Clear invalid tokens
      clearTokens();
      return null;
    }
  }

  return tokens.access_token;
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

/**
 * getAccessToken
 *
 * Coba ambil access token dengan urutan prioritas:
 *  1. Token user (dari localStorage setelah login personal) — DICEK EXPIRY + AUTO REFRESH
 *  2. Guest/demo token (dari server, pakai credentials pemilik app)
 *
 * Dengan ini pengunjung bisa lihat data market TANPA harus login.
 * Login tetap tersedia untuk fitur personal (akun, order, dll).
 *
 * ✅ FIX (root cause 401 berulang + WS disconnect 1006 berulang):
 * Versi lama langsung return `userTokens.access_token` dari localStorage TANPA
 * cek expired. Access token Saxo SIM hanya hidup ~20 menit — setelah itu semua
 * request (price, accounts, WS auth) ditolak 401/1006 terus-menerus karena token
 * yang SAMA (panjang string sama setiap saat di log) selalu dipakai ulang tanpa
 * pernah di-refresh.
 */
export async function getAccessToken(): Promise<string | null> {
  // 1. Coba token user dulu (paling prioritas)
  const userTokens = getStoredTokens();
  if (userTokens?.access_token) {
    if (!isTokenExpired()) {
      return userTokens.access_token;
    }

    // Token sudah/akan expired — refresh dulu sebelum dipakai
    try {
      console.log("[Saxo] User access token expired, refreshing...");
      const refreshed = await refreshAccessTokenLocked(userTokens.refresh_token);
      console.log("[Saxo] ✅ Token refreshed, new length:", refreshed.access_token.length);
      return refreshed.access_token;
    } catch (error) {
      console.error("[Saxo] ❌ Refresh gagal (refresh_token juga kadaluarsa/invalid):", error);
      clearTokens();
      // Jangan return null di sini — lanjut ke guest token di bawah supaya
      // chart tetap tampil (mode guest) walau sesi personal user sudah habis.
    }
  }

  // 2. Fallback ke guest/demo token (server-side)
  if (typeof window === "undefined") return null; // server-side render, skip

  try {
    const res = await fetch("/api/saxo/guest-token");
    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) {
        console.log("[Saxo] Using demo/guest token for market data");
        return data.accessToken;
      }
    }
  } catch {
    // Guest token tidak tersedia — tidak apa-apa, return null
  }

  return null;
}
