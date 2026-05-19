/* build:1779222473 */
export const toInt = (v, fallback = 0) => Number.isFinite(Number(v)) ? Math.round(Number(v)) : Math.round(Number(fallback) || 0);

export const toPosInt = (v, min = 0) => Math.max(Math.round(Number(min) || 0), toInt(v, min));

export const toTrimmed = v => String(v ?? "").trim();

export const evalExpr = (input, fallback) => {
  const s = String(input ?? "").trim();
  if (!s) return fallback;
  const n = Number(s.replace(",", "."));
  if (Number.isFinite(n)) return n;
  const normalized = s.replace(/,/g, ".").replace(/\s+/g, "");
  if (!/^[0-9+\-*/().]+$/.test(normalized)) return fallback;
  try {
    const v = Function(`"use strict";return (${normalized});`)();
    return Number.isFinite(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

export const toRoundedInt = (v, fallback = 0) => {
  const n = Number(v);
  if (Number.isFinite(n)) return Math.round(n);
  const f = Number(fallback);
  return Number.isFinite(f) ? Math.round(f) : 0;
};

export const clampInt = (v, min, max, fallback = min) => Math.max(min, Math.min(max, toRoundedInt(v, fallback)));

export const toPositiveInt = (v, fallback = 1) => Math.max(1, toRoundedInt(v, fallback));

export const parseAreaM2PxInput = (input, fallback) => {
  const s = String(input ?? "").trim();
  if (!s) return Math.max(1, Math.round(Number(fallback) || 65536));
  const m = s.match(/^\s*(\d+(?:[.,]\d+)?)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)\s*$/i);
  if (m) {
    const a = Number(String(m[1]).replace(",", "."));
    const b = Number(String(m[2]).replace(",", "."));
    const p = a * b;
    if (Number.isFinite(p) && p > 0) return Math.max(1, Math.round(p));
  }
  const parsed = evalExpr(s, fallback);
  const n = Number(parsed);
  if (!Number.isFinite(n) || n <= 0) return Number(fallback) || 65536;
  return Math.max(1, Math.round(n));
};

