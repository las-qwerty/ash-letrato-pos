import { describe, expect, it } from 'vitest';
import { encodeCode128, isValidEan13 } from './index';

describe('encodeCode128', () => {
  it('encodes a SKU: start + chars + checksum + stop', () => {
    const enc = encodeCode128('SKU-001')!;
    expect(enc).not.toBeNull();
    // 1 start (6 digits) + 7 chars (6 each) + checksum (6) + stop (7) = 55 modules-ish
    // widths array covers start(6) + 7×6 + 6 + 7 = 55 entries
    expect(enc.widths).toHaveLength(6 + 7 * 6 + 6 + 7);
    expect(enc.modules).toBe(enc.widths.reduce((a, b) => a + b, 0));
  });

  it('checksum verifies: (start + Σpos·val) mod 103 maps to the checksum pattern', () => {
    // 'A' → code 33; sum = 104 + 1·33 = 137 → 137 mod 103 = 34 → pattern '131123'.
    const enc = encodeCode128('A')!;
    // widths: [start 6][A 6][checksum 6][stop 7]
    expect(enc.widths.slice(12, 18).join('')).toBe('131123');
  });

  it('rejects empty and non-ASCII text', () => {
    expect(encodeCode128('   ')).toBeNull();
    expect(encodeCode128('₱100')).toBeNull();
  });
});

describe('isValidEan13', () => {
  it('validates the check digit', () => {
    // 4006381333931 is a textbook valid EAN-13
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('4006381333932')).toBe(false);
    expect(isValidEan13('12345')).toBe(false);
    expect(isValidEan13('abcdefghijklm')).toBe(false);
  });
});
