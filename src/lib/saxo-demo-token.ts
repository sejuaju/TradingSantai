/**
 * saxo-demo-token.ts
 *
 * Menyimpan & membaca demo/guest refresh token ke file JSON lokal.
 * File: <project_root>/.saxo-demo-token.json  (gitignored, server-only)
 *
 * Flow:
 *  - Login pertama kali → token disimpan otomatis ke file
 *  - Guest token endpoint → baca dari file, auto-refresh, update file
 *  - Tidak perlu env var manual, tidak perlu DevTools
 *
 * Catatan production:
 *  - Vercel / serverless → filesystem read-only, pakai DB/Redis/env var
 *  - Self-hosted / local → file approach ini bekerja dengan baik
 */

import fs   from "fs";
import path from "path";

const DEMO_TOKEN_FILE = path.join(process.cwd(), ".saxo-demo-token.json");

export interface DemoTokenData {
  refreshToken: string;
  savedAt:      string;
}

/** Baca demo token dari file. Null jika belum ada. */
export function readDemoToken(): DemoTokenData | null {
  try {
    const content = fs.readFileSync(DEMO_TOKEN_FILE, "utf-8");
    return JSON.parse(content) as DemoTokenData;
  } catch {
    return null;
  }
}

/** Simpan/update demo token ke file. */
export function saveDemoToken(refreshToken: string): void {
  const data: DemoTokenData = {
    refreshToken,
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(DEMO_TOKEN_FILE, JSON.stringify(data, null, 2), "utf-8");
  console.log("[DemoToken] ✅ Demo token saved to", DEMO_TOKEN_FILE);
}

/**
 * Simpan demo token hanya jika belum ada.
 * Dipanggil setiap login OAuth — login pertama = auto-setup demo token.
 */
export function saveDemoTokenIfNotExists(refreshToken: string): void {
  const existing = readDemoToken();
  if (!existing) {
    saveDemoToken(refreshToken);
    console.log(
      "[DemoToken] 🎉 First login detected — demo token auto-configured!\n" +
      "            Pengunjung sekarang bisa lihat market data tanpa login."
    );
  }
}

/** Apakah demo token sudah dikonfigurasi? */
export function isDemoTokenConfigured(): boolean {
  // Check file
  if (readDemoToken() !== null) return true;
  // Fallback: check env var
  if (process.env.SAXO_DEMO_REFRESH_TOKEN) return true;
  return false;
}
