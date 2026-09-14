// components/ReservedBand.tsx -- the full diagonal reserved-corner band.
// Locked decision (spec.md `oneIsEnough` presentation split): on the /shared
// listing card, shown ONLY when oneIsEnough=true AND any option is reserved
// (WishCard reads this from lib/wish-state.ts's fullyReserved, never
// recomputed here). Reused as-is on /shared/:wishId (Phase 3) for the
// per-option band in the oneIsEnough=false case -- `label` lets that call
// site say "Opción reservada" instead of the wish-level default, same shape,
// no duplicated component. Parent must be `relative overflow-hidden`.

export function ReservedBand({ label = 'Ya reservado' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="pointer-events-none absolute -right-11 top-5 w-40 rotate-45 animate-fade-in bg-danger-solid py-1 text-center text-[11px] font-bold uppercase tracking-wide text-white shadow-md"
    >
      {label}
    </div>
  );
}
