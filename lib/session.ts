// lib/session.ts — stateless signed session tokens (HMAC-SHA256), ported
// from dcuero-app/lib/session.js (design.md Decision 9). The whole session
// travels signed inside the cookie itself: no shared store is needed to
// verify it, which suits serverless (no guaranteed process continuity
// between invocations). Accepted trade-off, same as the reference: a single
// token cannot be revoked before it expires on its own.

import crypto from 'node:crypto';

export type SessionPayload = {
  sub: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('lib/session: missing required env var SESSION_SECRET');
  }
  return secret;
}

export function sign(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verify(token: string | null | undefined): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  // Constant-time comparison: avoids leaking how many leading bytes matched
  // via response-time differences if an attacker tries forging signatures
  // byte by byte.
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.exp || Date.now() > payload.exp) return null; // expired
  return payload;
}

/**
 * Timing-safe password comparison for the admin login form (design.md's
 * Admin Auth Flow): digesting both sides first keeps the comparison
 * length-independent, so it can never leak the real password's length.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const aDigest = crypto.createHash('sha256').update(a).digest();
  const bDigest = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(aDigest, bDigest);
}
