// components/ReservedBand.tsx -- the full diagonal "YA RESERVADO" corner
// band. Locked decision (spec.md `oneIsEnough` presentation split): shown on
// the /shared listing card ONLY when oneIsEnough=true AND any option is
// reserved (WishCard reads this from lib/wish-state.ts's fullyReserved,
// never recomputed here). Parent must be `relative overflow-hidden`.

export function ReservedBand() {
  return (
    <div
      role="status"
      aria-label="Este deseo ya fue reservado"
      className="pointer-events-none absolute -right-11 top-5 w-40 rotate-45 bg-red-600 py-1 text-center text-[11px] font-bold uppercase tracking-wide text-white shadow-md"
    >
      Ya reservado
    </div>
  );
}
