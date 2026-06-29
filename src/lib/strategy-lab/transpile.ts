import { parseStrategySource } from "./parser";
import type { OnTickFn, StrategyInput } from "./types";

function stripTypes(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\b(double|int|void|bool|long|string)\b/g, "")
    .replace(/;/g, "\n");
}

function transpileBody(body: string, inputs: StrategyInput[]): string {
  let js = stripTypes(body);

  for (const inp of inputs) {
    const re = new RegExp(`\\b${inp.name}\\b`, "g");
    js = js.replace(re, `inputs.${inp.name}`);
  }

  const replacements: [RegExp, string][] = [
    [/\biRSI\s*\(/g, "ctx.iRSI("],
    [/\biEMA\s*\(/g, "ctx.iEMA("],
    [/\biMA\s*\(/g, "ctx.iMA("],
    [/\biATR\s*\(/g, "ctx.iATR("],
    [/\bSignalBuy\s*\(/g, "ctx.signalBuy("],
    [/\bSignalSell\s*\(/g, "ctx.signalSell("],
    [/\bClose\b/g, "ctx.close"],
    [/\bOpen\b/g, "ctx.open"],
    [/\bHigh\b/g, "ctx.high"],
    [/\bLow\b/g, "ctx.low"],
  ];

  for (const [re, rep] of replacements) {
    js = js.replace(re, rep);
  }

  return js;
}

export function compileOnTick(source: string): {
  ok: boolean;
  error?: string;
  inputs: StrategyInput[];
  onTick?: OnTickFn;
  warnings: string[];
} {
  const parsed = parseStrategySource(source);
  if (!parsed.ok) {
    return { ok: false, error: parsed.errors.join(" "), inputs: parsed.inputs, warnings: parsed.warnings };
  }

  try {
    const jsBody = transpileBody(parsed.onTickBody, parsed.inputs);
    const fn = new Function(
      "ctx",
      "inputs",
      `"use strict";\n${jsBody}`,
    ) as OnTickFn;

    return { ok: true, inputs: parsed.inputs, onTick: fn, warnings: parsed.warnings };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal compile strategi.";
    return { ok: false, error: msg, inputs: parsed.inputs, warnings: parsed.warnings };
  }
}