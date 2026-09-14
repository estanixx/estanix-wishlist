import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { WishWithOptions } from '@/lib/types';
import { deriveWishState } from '@/lib/wish-state';
import { ImageMiniGrid } from './ImageMiniGrid';
import { ReservedBand } from './ReservedBand';
import { PartialReservationBadge } from './PartialReservationBadge';

// components/WishCard.tsx -- one card per wish on /shared (spec.md
// `shared-public-ui`). The whole card is the click target (Link wraps
// everything); "Ver detalles" is a styled span, not a nested <button>,
// to keep the card a single valid interactive element.
//
// Reservation state comes exclusively from lib/wish-state.ts's
// deriveWishState() (design.md's single source of truth) -- this component
// never recomputes fullyReserved/partiallyReserved itself.
export function WishCard({ wish }: { wish: WishWithOptions }) {
  const { fullyReserved, partiallyReserved } = deriveWishState(wish);

  return (
    <Link
      href={`/shared/${wish.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface/60 transition duration-200 ease-out hover:-translate-y-1 hover:border-border-strong hover:shadow-lg hover:shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {fullyReserved && <ReservedBand />}
      <ImageMiniGrid options={wish.options} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 text-lg font-semibold text-foreground">{wish.title}</h3>
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-foreground-muted">{wish.description}</p>
        {partiallyReserved && <PartialReservationBadge />}
        <span className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition duration-200 group-hover:bg-accent-hover">
          Ver detalles
          <ArrowRight className="h-4 w-4 transition duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
