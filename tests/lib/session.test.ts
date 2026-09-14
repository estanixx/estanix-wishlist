// tests/lib/session.test.ts — [RED] HMAC-signed session token sign/verify
// roundtrip (design.md Decision 9, ported from dcuero-app/lib/session.js's
// own suite). This is Phase 4's highest-risk new code per the apply
// instructions: a broken check either locks the owner out or lets anyone
// into admin, so every failure branch gets its own case.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sign, timingSafeEqualString, verify } from '../../lib/session';

const REAL_SECRET = 'test-session-secret-1234567890';

describe('lib/session', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = REAL_SECRET;
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it('sign() then verify() roundtrips the exact payload', () => {
    const token = sign({ sub: 'admin', exp: Date.now() + 60_000 });
    const payload = verify(token);
    expect(payload?.sub).toBe('admin');
  });

  it('rejects a tampered signature', () => {
    const token = sign({ sub: 'admin', exp: Date.now() + 60_000 });
    const [body] = token.split('.');
    const tampered = `${body}.deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdead`;
    expect(verify(tampered)).toBeNull();
  });

  it('rejects a tampered body (payload edited, signature left as-is)', () => {
    const token = sign({ sub: 'admin', exp: Date.now() + 60_000 });
    const [, sig] = token.split('.');
    const forgedBody = Buffer.from(JSON.stringify({ sub: 'attacker', exp: Date.now() + 60_000 })).toString('base64url');
    expect(verify(`${forgedBody}.${sig}`)).toBeNull();
  });

  it('rejects a truncated token (missing signature segment)', () => {
    const token = sign({ sub: 'admin', exp: Date.now() + 60_000 });
    const [body] = token.split('.');
    expect(verify(body)).toBeNull();
  });

  it('rejects an empty string', () => {
    expect(verify('')).toBeNull();
  });

  it('rejects null/undefined tokens', () => {
    expect(verify(null)).toBeNull();
    expect(verify(undefined)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = sign({ sub: 'admin', exp: Date.now() - 1000 });
    expect(verify(token)).toBeNull();
  });

  it('rejects a token signed under a different secret (wrong secret)', () => {
    const token = sign({ sub: 'admin', exp: Date.now() + 60_000 });
    process.env.SESSION_SECRET = 'a-completely-different-secret';
    expect(verify(token)).toBeNull();
  });

  it('sign() throws when SESSION_SECRET is missing', () => {
    delete process.env.SESSION_SECRET;
    expect(() => sign({ sub: 'admin', exp: Date.now() + 60_000 })).toThrow();
  });

  it('verify() throws when SESSION_SECRET is missing (fails closed, never treats a token as valid without a secret)', () => {
    const token = sign({ sub: 'admin', exp: Date.now() + 60_000 });
    delete process.env.SESSION_SECRET;
    expect(() => verify(token)).toThrow();
  });

  it('timingSafeEqualString: true for equal strings, false for different strings/lengths', () => {
    expect(timingSafeEqualString('correct-password', 'correct-password')).toBe(true);
    expect(timingSafeEqualString('correct-password', 'wrong-password')).toBe(false);
    expect(timingSafeEqualString('short', 'a-much-longer-string')).toBe(false);
  });
});
