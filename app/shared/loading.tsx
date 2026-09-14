import { WishCardSkeleton } from '@/components/Skeleton';

// app/shared/loading.tsx -- Next.js App Router route-level Suspense boundary,
// shown automatically while page.tsx's async listWishesWithOptions() call
// resolves (SPEC.md §8: skeleton/loading states while data loads).
export default function SharedLoading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded-md bg-surface-strong" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-surface-strong" />
      </header>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <WishCardSkeleton key={index} />
        ))}
      </div>
    </main>
  );
}
