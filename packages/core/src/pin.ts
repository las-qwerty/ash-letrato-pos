import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

/**
 * PIN hashing for the local demo. A PIN has only 10,000 values, so the hash
 * must be slow to brute-force: PBKDF2-SHA256 with a random salt per PIN.
 *
 * Stored as `pbkdf2-sha256$<iterations>$<salt>$<hash>` (base64 fields).
 * WebCrypto runs it natively on secure origins (HTTPS, localhost). Plain-HTTP
 * origins use a pure-JS implementation with identical output, just slower.
 * Hashes from the old fixed-salt scheme still verify and are upgraded on the
 * next successful entry.
 */

const FORMAT = 'pbkdf2-sha256';
const ITERATIONS = 600_000;
const MAX_ITERATIONS = 2_000_000;
const LEGACY_SALT = 'simmy-pos:v1:';
const enc = new TextEncoder();

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
      key,
      256,
    );
    return new Uint8Array(bits);
  }
  return pbkdf2Async(sha256, enc.encode(pin), salt, { c: iterations, dkLen: 32 });
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, ITERATIONS);
  return [FORMAT, ITERATIONS, toB64(salt), toB64(hash)].join('$');
}

/** `stale` means the stored hash should be replaced with a fresh one. */
export async function checkPin(pin: string, stored: string): Promise<{ ok: boolean; stale: boolean }> {
  if (!stored.startsWith(`${FORMAT}$`)) {
    return { ok: (await legacyHash(pin)) === stored, stale: true };
  }
  const [, count, salt, hash] = stored.split('$');
  const iterations = Number(count);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS || !salt || !hash) {
    return { ok: false, stale: false };
  }
  const actual = await derive(pin, fromB64(salt), iterations);
  return { ok: timingSafeEqual(actual, fromB64(hash)), stale: iterations < ITERATIONS };
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** The pre-upgrade fixed-salt scheme, kept only so existing PINs still verify. */
async function legacyHash(pin: string): Promise<string> {
  const input = LEGACY_SALT + pin;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv${(h >>> 0).toString(16)}`;
}
