import { NextResponse } from 'next/server';
import { incrementVisits } from '@/lib/wish-repository';

export const dynamic = 'force-dynamic';

// Client dedup (localStorage `wishlist_visit_counted`, Phase 2/3) decides
// WHETHER to call this; the server never re-checks that -- it just performs
// one atomic ADD (design.md access pattern #10, no read-then-write).
export async function POST() {
  const visits = await incrementVisits();
  return NextResponse.json({ visits });
}
