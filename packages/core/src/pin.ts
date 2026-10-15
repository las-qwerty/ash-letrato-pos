/**
 * PIN hashing for the local-only demo.
 *
 * Register PINs are never persisted as plaintext — we store a salted SHA-256.
 * crypto.subtle only exists in secure contexts (HTTPS / localhost); when the
 * app is served over plain HTTP on the LAN we fall back to FNV-1a, which is
 * obfuscation rather than real hashing — documented limitation until the
 * backend API handles auth server-side.
 */

const SALT = 'simmy-pos:v1:';

export async function hashPin(pin: string): Promise<string> {
  const input = SALT + pin;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(input),
    );
    return [...new Uint8Array(buf)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // FNV-1a 32-bit fallback for non-secure contexts
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv${(h >>> 0).toString(16)}`;
}
