/**
 * Safe formatting helpers — handle null/undefined/string gracefully.
 * Prevents "Cannot read properties of undefined (reading 'toFixed')" errors
 * when API responses have missing or differently-typed fields.
 */

export function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const n = parseFloat(value);
    return isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function fixed(value: unknown, digits = 2, fallback = 0): string {
  return num(value, fallback).toFixed(digits);
}

export function money(value: unknown, digits = 2, prefix = "$"): string {
  return `${prefix}${num(value).toFixed(digits)}`;
}

export function pct(value: unknown, digits = 1): string {
  return `${(num(value) * 100).toFixed(digits)}%`;
}

export function signedMoney(value: unknown, digits = 2, prefix = "$"): string {
  const n = num(value);
  return `${n >= 0 ? "+" : ""}${prefix}${n.toFixed(digits)}`;
}

export function signedPct(value: unknown, digits = 2): string {
  const n = num(value) * 100;
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}