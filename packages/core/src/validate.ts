/** Shared input validation — used by web + mobile forms. */

export const isEmail = (s: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export const isPhone = (s: string) =>
  /^[+()\-.\s\d]{7,20}$/.test(s.trim());

export const isPin = (s: string) => /^\d{4,6}$/.test(s);

/** Promo/discount codes: letters, digits, dash, underscore — 3–20 chars. */
export const isPromoCode = (s: string) => /^[A-Z0-9_-]{3,20}$/.test(s.trim());

/** SKU/barcode: printable, no whitespace-only. */
export const isSku = (s: string) => /^[A-Z0-9][A-Z0-9\-_/]{1,29}$/i.test(s.trim());

export const clampQty = (n: number) => Math.min(999, Math.max(0, Math.floor(n)));

export const clampPct = (n: number) => Math.min(100, Math.max(0, n));

export const nonNeg = (n: number) => Math.max(0, n);

export const inRange = (n: number, min: number, max: number) =>
  Number.isFinite(n) && n >= min && n <= max;

/** Money entry: positive, ≤ 1M, max 2 decimals. */
export const isMoney = (n: number) =>
  Number.isFinite(n) && n >= 0 && n <= 1_000_000 && Math.round(n * 100) === n * 100;

/** Area dimensions for priced-by-size services, in feet. */
export const isDimension = (n: number) => inRange(n, 0.1, 500);

/** Cart lines still missing a required handler assignment before checkout. */
export const missingHandlers = <T extends { handlerId?: string }>(lines: T[]): T[] =>
  lines.filter((l) => !l.handlerId);
