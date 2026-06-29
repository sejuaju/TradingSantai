import type { ParseResult, StrategyInput } from "./types";

const FORBIDDEN =
  /\b(eval|Function|import|require|fetch|XMLHttpRequest|window|document|process|globalThis|constructor)\b/i;

const SUPPORTED_FUNCS = [
  "iRSI", "iMA", "iEMA", "iATR", "SignalBuy", "SignalSell",
  "Close", "Open", "High", "Low",
];

export function parseStrategySource(source: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!source.trim()) {
    return { ok: false, inputs: [], onTickBody: "", errors: ["Kode strategi kosong."], warnings };
  }

  if (FORBIDDEN.test(source)) {
    errors.push("Kode mengandung fungsi yang tidak diizinkan untuk keamanan sandbox.");
  }

  const inputs: StrategyInput[] = [];
  const inputRe = /input\s+(int|double)\s+(\w+)\s*=\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = inputRe.exec(source)) !== null) {
    const type = m[1].toLowerCase() as "int" | "double";
    const name = m[2];
    const raw = m[3].trim();
    const value = type === "int" ? parseInt(raw, 10) : parseFloat(raw);
    if (!Number.isFinite(value)) {
      errors.push(`Input "${name}" tidak valid: ${raw}`);
      continue;
    }
    inputs.push({ name, type, value });
  }

  const onTickMatch = source.match(/void\s+OnTick\s*\(\s*\)\s*\{([\s\S]*)\}/i);
  if (!onTickMatch) {
    errors.push('Fungsi void OnTick() { ... } wajib ada.');
    return { ok: false, inputs, onTickBody: "", errors, warnings };
  }

  const onTickBody = onTickMatch[1].trim();

  const unknownCall = onTickBody.match(/\b([A-Za-z_]\w*)\s*\(/g) ?? [];
  for (const call of unknownCall) {
    const fn = call.replace(/\s*\($/, "");
    if (
      !SUPPORTED_FUNCS.includes(fn) &&
      !inputs.some((i) => i.name === fn) &&
      !["if", "for", "while", "Math"].includes(fn)
    ) {
      warnings.push(`Fungsi "${fn}()" belum didukung di TS-MQL5 v1 — mungkin gagal di MT5 export.`);
    }
  }

  return {
    ok: errors.length === 0,
    inputs,
    onTickBody,
    errors,
    warnings,
  };
}

export function validateUploadFile(name: string, size: number): string | null {
  if (!name.toLowerCase().endsWith(".mq5")) {
    return "Hanya file .mq5 yang didukung untuk upload.";
  }
  if (size > 512_000) {
    return "File terlalu besar (maks 512 KB).";
  }
  return null;
}