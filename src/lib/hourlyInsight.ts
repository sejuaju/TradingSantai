import { LOGIN_INSIGHTS, type AuthInsight } from "./authInsights";

/** Popup check-in edukasi setiap 1 jam untuk user yang sudah login */
export const HOURLY_INTERVAL_MS = 60 * 60 * 1000;

function storageKey(userId: string) {
  return `ts_hourly_insight_${userId}`;
}

export function getLastShown(userId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function setLastShown(userId: string, at = Date.now()) {
  localStorage.setItem(storageKey(userId), String(at));
}

/** Anchor timer on first session — popup pertama setelah 1 jam */
export function initHourlyInsight(userId: string) {
  if (getLastShown(userId) === null) {
    setLastShown(userId);
  }
}

export function shouldShowHourlyInsight(userId: string): boolean {
  const last = getLastShown(userId);
  if (last === null) return false;
  return Date.now() - last >= HOURLY_INTERVAL_MS;
}

export function msUntilNextInsight(userId: string): number {
  const last = getLastShown(userId);
  if (last === null) return HOURLY_INTERVAL_MS;
  return Math.max(0, HOURLY_INTERVAL_MS - (Date.now() - last));
}

export function pickHourlyInsight(): AuthInsight {
  return LOGIN_INSIGHTS[Math.floor(Math.random() * LOGIN_INSIGHTS.length)];
}