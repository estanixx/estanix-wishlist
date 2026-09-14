import { Skeleton } from '@/components/Skeleton';

// app/shared/[wishId]/loading.tsx -- route-level Suspense boundary while
// page.tsx's getWishWithOptions() resolves, same pattern as
// app/shared/loading.tsx (Phase 2).
export default function WishDetailLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-5/6" />
      <div className="mt-6 flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface/60 p-4 sm:flex-row">
        <Skeleton className="h-56 w-full shrink-0 sm:w-72" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-4 h-9 w-32 rounded-lg" />
        </div>
      </div>
    </main>
  );
}
