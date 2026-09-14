import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session-guard';
import { resetAllReservations } from '@/lib/wish-repository';

export const dynamic = 'force-dynamic';

// app/api/admin/reset-reservations/route.ts -- spec.md `admin-wish-management`:
// global-only reset (locked decision, no per-wish scope exists). Never
// touches visitor localStorage/sessionStorage claims -- documented
// tradeoff, not server-clearable (design.md/spec.md).
export async function POST(request: Request) {
  const auth = requireAuth(request);
  if ('response' in auth) return auth.response;

  const resetCount = await resetAllReservations();
  return NextResponse.json({ resetCount });
}
