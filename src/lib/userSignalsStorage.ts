import type { Signal } from "@/components/terminal/types";

const GUEST_KEY = "tradingsantai_signals_guest";
const USER_KEY_PREFIX = "tradingsantai_signals_";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function getSignalsStorageKey(userId: string | null | undefined): string {
  return userId ? `${USER_KEY_PREFIX}${userId}` : GUEST_KEY;
}

export function loadUserSignals(userId: string | null | undefined): Signal[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(getSignalsStorageKey(userId));
    if (!raw) return [];

    const parsed: Signal[] = JSON.parse(raw);
    const now = Date.now();

    return parsed.filter((s) => {
      const ts = s.time || s.closeTime || 0;
      const ageOk = now - ts < MAX_AGE_MS;
      const ownerOk = userId ? s.userId === userId : !s.userId;
      return ageOk && ownerOk;
    });
  } catch {
    return [];
  }
}

export function saveUserSignals(userId: string | null | undefined, signals: Signal[]): void {
  if (typeof window === "undefined") return;

  try {
    const key = getSignalsStorageKey(userId);
    const owned = userId
      ? signals.filter((s) => s.userId === userId)
      : signals.filter((s) => !s.userId);

    window.localStorage.setItem(key, JSON.stringify(owned));
  } catch (error) {
    console.error("[SIGNAL] Gagal menyimpan posisi user:", error);
  }
}

export function clearGuestSignals(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_KEY);
}