import { NextResponse } from 'next/server';
import { sign, timingSafeEqualString } from '@/lib/session';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/session-guard';

// app/api/admin/login/route.ts -- spec.md `admin-auth`: POST /api/admin/login
// {password} -> 200 + signed session cookie, or 401 {error:"invalid_password"}.
// Route path matches spec.md's admin-auth table exactly (design.md's own
// Folder Structure diagram shows a top-level /api/login -- spec.md is the
// locked acceptance criteria and wins; see apply-progress for the note).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = typeof body?.password === 'string' ? body.password : '';

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('app/api/admin/login: missing required env var ADMIN_PASSWORD');
  }

  if (!password || !timingSafeEqualString(password, adminPassword)) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 401 });
  }

  const token = sign({ sub: 'admin', exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
