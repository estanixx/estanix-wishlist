// lib/wish-state.ts — THE single source of truth for reservation UI state.
// Consumed by WishCard (listing, Phase 2), the detail page (Phase 3), and
// mirrors the server-side TransactWriteItems condition in
// lib/wish-repository.ts's reserveOption() (design.md access pattern #9).

import type { Option, Wish } from './types';

export type WishState = {
  /** oneIsEnough && reservedCount > 0 -- listing shows the full diagonal band, detail shows the single page-level message. */
  fullyReserved: boolean;
  /** !oneIsEnough && 0 < reservedCount < optionCount -- listing shows the subtle badge, never the band. */
  partiallyReserved: boolean;
  /** reservable && !fullyReserved -- gates whether any option of this wish can still be reserved. */
  canReserveAny: boolean;
};

export function deriveWishState(wish: Wish): WishState {
  const fullyReserved = wish.oneIsEnough && wish.reservedCount > 0;
  const partiallyReserved = !wish.oneIsEnough && wish.reservedCount > 0 && wish.reservedCount < wish.optionCount;
  const canReserveAny = wish.reservable && !fullyReserved;

  return { fullyReserved, partiallyReserved, canReserveAny };
}

export function canReserveOption(wish: Wish, option: Option): boolean {
  if (option.reserved) return false;
  return deriveWishState(wish).canReserveAny;
}
