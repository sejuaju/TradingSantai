/**
 * Mode setup Saxo hanya untuk admin (pemilik akun demo).
 * Pengunjung biasa tidak perlu dan tidak boleh login Saxo.
 *
 * Buka: /?saxo_setup=<NEXT_PUBLIC_SAXO_SETUP_KEY>
 */

const SESSION_KEY = "saxo_setup_mode";

export function isSaxoSetupModeEnabled(): boolean {
  if (typeof window === "undefined") return false;

  const expected = process.env.NEXT_PUBLIC_SAXO_SETUP_KEY?.trim();
  if (!expected) return false;

  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("saxo_setup");
  if (fromUrl === expected) {
    sessionStorage.setItem(SESSION_KEY, "1");
    return true;
  }

  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function clearSaxoSetupMode(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}