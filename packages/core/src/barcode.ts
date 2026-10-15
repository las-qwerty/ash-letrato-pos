/**
 * Code 128 (subset B) encoder — produces bar-width run lengths for SVG rendering.
 * Pattern table: each entry encodes the alternating bar/space widths (6 digits).
 */

const PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312',
  '132212', '221213', '221312', '231212', '112232', '122132', '122231', '113222',
  '123122', '123221', '223211', '221132', '221231', '213212', '223112', '312131',
  '311222', '321122', '321221', '312212', '322112', '322211', '212123', '212321',
  '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121',
  '313121', '211331', '231131', '213113', '213311', '213131', '311123', '311321',
  '331121', '312113', '312311', '332111', '314111', '221411', '431111', '111224',
  '111422', '121124', '121421', '141122', '141221', '112214', '112412', '122114',
  '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112',
  '421211', '212141', '214121', '412121', '111143', '111341', '131141', '114113',
  '114311', '411113', '411311', '113141', '114131', '311141', '411131', '211412',
  '211214', '211232', '2331112',
];

const START_B = 104;
const STOP = 106;

export interface EncodedBarcode {
  /** Bar-space run lengths including start, data, checksum, and stop pattern. */
  widths: number[];
  /** Total modules wide (sum of widths) — use for viewBox sizing. */
  modules: number;
  /** The human-readable text that was encoded. */
  text: string;
}

/**
 * Encode ASCII 32–126 text as Code 128-B. Returns null for empty/unsupported text.
 */
export function encodeCode128(raw: string): EncodedBarcode | null {
  const text = raw.trim();
  if (!text) return null;
  const codes: number[] = [START_B];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) return null;
    codes.push(code - 32);
  }
  // checksum = (start + Σ position·value) mod 103
  let sum = START_B;
  for (let i = 1; i < codes.length; i++) sum += codes[i]! * i;
  codes.push(sum % 103, STOP);

  const widths = codes.flatMap((c) => PATTERNS[c]!.split('').map(Number));
  return { widths, modules: widths.reduce((a, b) => a + b, 0), text };
}

/** EAN-13 valid 13-digit string? (For validating existing product barcodes.) */
export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check =
    (10 -
      (digits
        .slice(0, 12)
        .reduce((a, d, i) => a + d * (i % 2 === 0 ? 1 : 3), 0) %
        10)) %
    10;
  return digits[12] === check;
}
