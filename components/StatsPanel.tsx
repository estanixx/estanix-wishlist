// components/StatsPanel.tsx -- spec.md §7 "view stats": total /shared
// visits and which wishes/options are currently reserved. Purely
// presentational -- app/me/page.tsx (Server Component) reads
// getVisits()/listWishesWithOptions() directly, same pattern as
// app/api/admin/stats/route.ts, and passes the derived numbers down.
export type ReservedStatEntry = {
  wishId: string;
  wishTitle: string;
  optionId: string;
  optionTitle: string;
  reservedAt: string | null;
};

export function StatsPanel({
  totalVisits,
  reservedCount,
  totalOptions,
  reservedList,
}: {
  totalVisits: number;
  reservedCount: number;
  totalOptions: number;
  reservedList: ReservedStatEntry[];
}) {
  const reservedWishCount = new Set(reservedList.map(entry => entry.wishId)).size;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h2 className="text-lg font-semibold text-zinc-100">Estadísticas</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Visitas a /shared" value={totalVisits} />
        <Stat label="Opciones reservadas" value={`${reservedCount} / ${totalOptions}`} />
        <Stat label="Deseos con reservas" value={reservedWishCount} />
      </div>

      {reservedList.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-300">Reservado actualmente</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-zinc-400">
            {reservedList.map(entry => (
              <li key={entry.optionId}>
                <span className="text-zinc-200">{entry.wishTitle}</span> — {entry.optionTitle}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-zinc-950/60 p-4">
      <p className="text-2xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}
