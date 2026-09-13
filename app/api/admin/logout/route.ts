import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-guard';

// app/api/admin/logout/route.ts -- spec.md `admin-auth`: POST /api/admin/logout
// -> 200, cookie cleared (design.md: "Set-Cookie with Max-Age=0"). No auth
// guard needed here -- clearing an already-absent/invalid cookie is a no-op,
// and requiring a valid session to log out would strand a user with an
// already-expired one.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
