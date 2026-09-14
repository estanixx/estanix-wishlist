import { CircleDot } from 'lucide-react';

// components/PartialReservationBadge.tsx -- the SUBTLE indicator, distinct
// from ReservedBand's full diagonal band. Locked decision: shown on the
// /shared listing card when oneIsEnough=false AND some (not all) options are
// reserved (WishCard reads this from lib/wish-state.ts's partiallyReserved).

export function PartialReservationBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-warning-accent/10 px-2.5 py-1 text-xs font-medium text-warning ring-1 ring-inset ring-warning-accent/25">
      <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
      algunas opciones reservadas
    </span>
  );
}
