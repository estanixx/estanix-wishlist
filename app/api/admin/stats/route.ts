import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session-guard';
import { getVisits, listWishesWithOptions } from '@/lib/wish-repository';

export const dynamic = 'force-dynamic';

// app/api/admin/stats/route.ts -- spec.md `admin-wish-management`:
// GET {totalVisits, reservedCount, totalOptions, reservedList}.
export async function GET(request: Request) {
  const auth = requireAuth(request);
  if ('response' in auth) return auth.response;

  const [totalVisits, wishes] = await Promise.all([getVisits(), listWishesWithOptions()]);

  let totalOptions = 0;
  let reservedCount = 0;
  const reservedList: { wishId: string; wishTitle: string; optionId: string; optionTitle: string; reservedAt: string | null }[] = [];

  for (const wish of wishes) {
    totalOptions += wish.options.length;
    for (const option of wish.options) {
      if (!option.reserved) continue;
      reservedCount += 1;
      reservedList.push({
        wishId: wish.id,
        wishTitle: wish.title,
        optionId: option.id,
        optionTitle: option.title,
        reservedAt: option.reservedAt,
      });
    }
  }

  return NextResponse.json({ totalVisits, reservedCount, totalOptions, reservedList });
}
