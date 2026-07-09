/**
 * Foundational, dependency-free CLI utilities shared by brenner.ts and
 * robot-mode.ts. Extracted so robot-mode.ts (and any future per-command
 * module split off brenner.ts) can import these without creating a circular
 * dependency back on brenner.ts itself.
 */

import { readFileSync } from "node:fs";
import type { Json } from "./apps/web/src/lib/json";

export type ParsedArgs = {
  positional: string[];
  flags: Record<string, string | boolean>;
};

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? "";
    if (token === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }

    const eq = token.indexOf("=");
    if (eq !== -1) {
      const key = token.slice(2, eq).trim();
      const value = token.slice(eq + 1);
      flags[key] = value;
      continue;
    }

    const key = token.slice(2).trim();
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i++;
  }

  return { positional, flags };
}

export function asStringFlag(flags: ParsedArgs["flags"], key: string): string | undefined {
  const value = flags[key];
  if (typeof value === "string") return value;
  return undefined;
}

export function asBoolFlag(flags: ParsedArgs["flags"], key: string): boolean {
  return flags[key] === true;
}

export function asIntFlag(flags: ParsedArgs["flags"], key: string): number | undefined {
  const raw = asStringFlag(flags, key);
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new Error(`Invalid --${key}: expected integer, got "${raw}"`);
  return n;
}

export function splitCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isRecord(value: Json): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function ensureTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}

export function readTextFile(path: string): string {
  return readFileSync(path, "utf8");
}

export function stdoutLine(message: string): void {
  process.stdout.write(ensureTrailingNewline(message));
}

export function stderrLine(message: string): void {
  process.stderr.write(ensureTrailingNewline(message));
}
