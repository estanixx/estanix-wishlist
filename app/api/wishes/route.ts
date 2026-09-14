import { NextResponse } from 'next/server';
import { listWishesWithOptions } from '@/lib/wish-repository';
import type { WishWithOptions } from '@/lib/types';

// SPEC.md's "List reflects live state" scenario: every visitor must see
// real DynamoDB state on every load, so this route is never cached.
export const dynamic = 'force-dynamic';

function serializeWish(wish: WishWithOptions) {
  return {
    id: wish.id,
    title: wish.title,
    description: wish.description,
    oneIsEnough: wish.oneIsEnough,
    reservable: wish.reservable,
    // Not in spec's literal response shape, but required by lib/wish-state.ts's
    // deriveWishState() -- the sole source of truth for band/badge rendering
    // consumed by Phase 2/3's components (design.md's Interfaces/Contracts).
    reservedCount: wish.reservedCount,
    optionCount: wish.optionCount,
    options: wish.options.map(option => ({
      id: option.id,
      title: option.title,
      description: option.description,
      imageUrl: option.imageUrl,
      link: option.link,
      reserved: option.reserved,
    })),
  };
}

export async function GET() {
  const wishes = await listWishesWithOptions();
  return NextResponse.json(wishes.map(serializeWish));
}
