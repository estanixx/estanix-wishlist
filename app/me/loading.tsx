import { Skeleton } from '@/components/Skeleton';

// app/me/loading.tsx -- Next.js App Router route-level Suspense boundary,
// shown automatically while page.tsx's requirePageSession() + the parallel
// getVisits()/listWishesWithOptions() calls resolve. Same pattern as
// app/shared/loading.tsx (Phase 2) and app/shared/[wishId]/loading.tsx
// (Phase 3) -- Phase 6 closes the one gap those two didn't cover (SPEC.md
// §8: skeleton/loading states while data loads, applies to /me too).
export default function AdminDashboardLoading() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </header>

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/60 p-6">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-36 rounded-lg" />
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>

      <section className="flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-9 w-20 self-start rounded-lg sm:self-auto" />
          </div>
        ))}
      </section>
    </main>
  );
}
