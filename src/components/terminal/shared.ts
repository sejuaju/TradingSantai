// Shared colors, constants, and static maps used across the terminal
export const C = {
  cyan:   "#00d4e8",
  purple: "#a855f7",
  orange: "#f97316",
  green:  "#22c55e",
  red:    "#ef4444",
  amber:  "#f59e0b",
  blue:   "#3b82f6",
  pink:   "#ec4899",
  teal:   "#14b8a6",
} as const;

// ─── Global text colour scale (all legible on #060810 bg) ────────────────────
// T.mute  → decorative / placeholder  (was 0.25–0.35 — too dark)
// T.dim   → secondary labels          (was 0.38–0.45 — too dark)
// T.sub   → supporting values         (was 0.55–0.65)
// T.body  → primary labels            (was 0.75–0.82)
// T.main  → hero values               (was 0.90–0.96)
export const T = {
  mute : "rgba(255,255,255,0.50)",
  dim  : "rgba(255,255,255,0.62)",
  sub  : "rgba(255,255,255,0.75)",
  body : "rgba(255,255,255,0.88)",
  main : "rgba(255,255,255,0.97)",
} as const;

export const D   = "1px solid rgba(255,255,255,0.08)";
export const BG  = "#060810";
export const BG2 = "#08090f";

export const DETECT_MAP = [
  { short: "OVB",   long: "On Balance",    color: C.cyan,   base: 78 },
  { short: "OIT",   long: "Overall Trend", color: C.orange, base: 62 },
  { short: "GIT",   long: "Oscillator",    color: C.purple, base: 55 },
  { short: "CVG",   long: "CNN Analyst",   color: C.cyan,   base: 70 },
  { short: "GWAP",  long: "Wizard Core",   color: C.purple, base: 45 },
  { short: "BLOCK", long: "Neural Trade",  color: C.amber,  base: 60 },
  { short: "ARB",   long: "Automation",    color: C.teal,   base: 38 },
] as const;

export const WEIGHT_MAP = [
  { name: "VGA",   color: C.cyan,   base: 99 },
  { name: "GPI",   color: C.teal,   base: 99 },
  { name: "CIL",   color: C.purple, base: 46 },
  { name: "CVS",   color: C.purple, base: 30 },
  { name: "YWWF",  color: C.orange, base: 70 },
  { name: "BLOCK", color: C.amber,  base: 39 },
  { name: "ARS",   color: C.teal,   base: 64 },
] as const;
