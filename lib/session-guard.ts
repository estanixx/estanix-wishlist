// lib/session-guard.ts — replaces an Express-style `requireAuth` middleware
// for Next.js App Router Route Handlers (no middleware chain runs here, and
// `middleware.ts` itself executes on the Edge runtime where `node:crypto`
// is unavailable -- design.md Decision 9). Every `/api/admin/*` handler
// calls `requireAuth(request)` as its first statement; that call is the
// ONLY real security boundary. `requirePageSession()` below is UX-only
// (redirects an unauthenticated visitor away from `/me/*` pages) and must
// never be relied on as the sole check on any mutating path.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { verify, type SessionPayload } from './session';

export const SESSION_COOKIE = 'wishlist_session';
// 8 hours, matching design.md's Admin Auth Flow (`Max-Age=28800`).
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function parseCookieHeader(header: string, name: string): string | null {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

/** Reads and verifies the session cookie of a Route Handler's Request. Returns the payload or null. */
export function getSession(request: Request): SessionPayload | null {
  const header = request.headers.get('cookie') || '';
  const token = parseCookieHeader(header, SESSION_COOKIE);
  return verify(token);
}

export type AuthResult = { session: SessionPayload } | { response: NextResponse };

/**
 * The security boundary. Every `/api/admin/*` handler MUST call this as its
 * first statement (design.md's threat matrix "Route authorization" case) and
 * return `auth.response` immediately when present.
 */
export function requireAuth(request: Request): AuthResult {
  const session = getSession(request);
  if (!session) {
    return { response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  return { session };
}

/**
 * UX-only guard for `/me/*` Server Component pages: redirects to the login
 * page when there is no valid session. Never the security boundary -- see
 * the file-level note above.
 */
export async function requirePageSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!verify(token)) {
    redirect('/me/login');
  }
}

/** Used only by `/me/login` to bounce an already-authenticated visitor straight to the dashboard. */
export async function hasValidPageSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return verify(token) !== null;
}
