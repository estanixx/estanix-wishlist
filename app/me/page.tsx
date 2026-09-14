import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
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
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Panel de administración</h1>
          <p className="mt-1 text-sm text-foreground-muted">Gestioná los deseos y sus opciones.</p>
        </div>
        <LogoutButton />
      </header>

      <StatsPanel totalVisits={totalVisits} reservedCount={reservedCount} totalOptions={totalOptions} reservedList={reservedList} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/me/wishes/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition duration-200 hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo deseo
        </Link>
        <ResetReservationsButton />
      </div>

      <section className="flex flex-col gap-4">
        {wishes.length === 0 && <p className="py-10 text-center text-sm text-foreground-faint">Todavía no hay deseos.</p>}

        {wishes.map(wish => (
          <article
            key={wish.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="text-base font-semibold text-foreground">{wish.title}</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                {wish.options.length} {wish.options.length === 1 ? 'opción' : 'opciones'} ·{' '}
                {wish.oneIsEnough ? 'una alcanza' : 'todas disponibles'} · {wish.reservable ? 'reservable' : 'no reservable'}
              </p>
            </div>
            <Link
              href={`/me/wishes/${wish.id}/edit`}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border-strong px-4 py-2 text-sm font-medium text-foreground transition duration-200 hover:border-border-hover hover:bg-surface-strong sm:self-auto"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
