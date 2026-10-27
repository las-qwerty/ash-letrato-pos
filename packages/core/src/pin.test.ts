import { createHash, pbkdf2Sync } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkPin, hashPin } from './pin';

afterEach(() => vi.unstubAllGlobals());

describe('hashPin / checkPin', () => {
  it('accepts the right PIN and rejects a wrong one', async () => {
    const stored = await hashPin('2468');
    expect((await checkPin('2468', stored)).ok).toBe(true);
    expect((await checkPin('2469', stored)).ok).toBe(false);
  });

  it('stores no plaintext and salts every hash', async () => {
    const a = await hashPin('2468');
    const b = await hashPin('2468');
    expect(a).toMatch(/^pbkdf2-sha256\$600000\$/);
    expect(a).not.toContain('2468');
    expect(a).not.toBe(b);
  });

  it('a current hash is not stale', async () => {
    expect((await checkPin('2468', await hashPin('2468'))).stale).toBe(false);
  });

  it('verifies legacy fixed-salt hashes and marks them stale for upgrade', async () => {
    const legacy = createHash('sha256').update('simmy-pos:v1:2468').digest('hex');
    expect(await checkPin('2468', legacy)).toEqual({ ok: true, stale: true });
    expect((await checkPin('1111', legacy)).ok).toBe(false);
  });

  it('rejects malformed and oversized work factors', async () => {
    expect((await checkPin('2468', 'pbkdf2-sha256$999999999$AAAA$AAAA')).ok).toBe(false);
    expect((await checkPin('2468', 'pbkdf2-sha256$abc$AAAA$AAAA')).ok).toBe(false);
  });

  it('matches the reference PBKDF2 output on the non-WebCrypto path', { timeout: 60_000 }, async () => {
    const salt = Buffer.from('0123456789abcdef');
    const reference = pbkdf2Sync('2468', salt, 600_000, 32, 'sha256');
    const stored = `pbkdf2-sha256$600000$${salt.toString('base64')}$${reference.toString('base64')}`;
    const realRandom = crypto.getRandomValues.bind(crypto);
    vi.stubGlobal('crypto', { getRandomValues: realRandom });
    expect((await checkPin('2468', stored)).ok).toBe(true);
    const fresh = await hashPin('2468');
    vi.unstubAllGlobals();
    const [, , freshSalt = '', freshHash = ''] = fresh.split('$');
    const expected = pbkdf2Sync('2468', Buffer.from(freshSalt, 'base64'), 600_000, 32, 'sha256');
    expect(expected.toString('base64')).toBe(freshHash);
  });
});
