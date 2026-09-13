import Link from 'next/link';
import { requirePageSession } from '@/lib/session-guard';
import { getVisits, listWishesWithOptions } from '@/lib/wish-repository';
import { StatsPanel, type ReservedStatEntry } from '@/components/StatsPanel';
import { ResetReservationsButton } from '@/components/ResetReservationsButton';
import { LogoutButton } from '@/components/LogoutButton';

// app/me/page.tsx -- admin dashboard (spec.md §7): view all wishes +
// options, stats, global reset. requirePageSession() is the UX-only guard
// (redirects to /me/login); every mutating action below (reset button,
// edit/delete on the form pages) is independently protected by
// requireAuth() on its own API route -- design.md Decision 9's boundary
// note. force-dynamic for the same correctness reason as /shared: the
// admin must see live reservation/visit state on every load.
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  await requirePageSession();

  const [totalVisits, wishes] = await Promise.all([getVisits(), listWishesWithOptions()]);

  let totalOptions = 0;
  let reservedCount = 0;
  const reservedList: ReservedStatEntry[] = [];
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

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Panel de administración</h1>
          <p className="mt-1 text-sm text-zinc-400">Gestioná los deseos y sus opciones.</p>
        </div>
        <LogoutButton />
      </header>

      <StatsPanel totalVisits={totalVisits} reservedCount={reservedCount} totalOptions={totalOptions} reservedList={reservedList} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/me/wishes/new"
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition duration-200 hover:bg-white"
        >
          + Nuevo deseo
        </Link>
        <ResetReservationsButton />
      </div>

      <section className="flex flex-col gap-4">
        {wishes.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">Todavía no hay deseos.</p>}

        {wishes.map(wish => (
          <article
            key={wish.id}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="text-base font-semibold text-zinc-100">{wish.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {wish.options.length} {wish.options.length === 1 ? 'opción' : 'opciones'} ·{' '}
                {wish.oneIsEnough ? 'una alcanza' : 'todas disponibles'} · {wish.reservable ? 'reservable' : 'no reservable'}
              </p>
            </div>
            <Link
              href={`/me/wishes/${wish.id}/edit`}
              className="self-start rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition duration-200 hover:border-zinc-500 hover:bg-zinc-800 sm:self-auto"
            >
              Editar
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
