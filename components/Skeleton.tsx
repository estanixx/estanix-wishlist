// components/Skeleton.tsx -- generic loading placeholder + a WishCardSkeleton
// composed from it, used by app/shared/loading.tsx (Next.js App Router
// route-level Suspense loading state) while listWishesWithOptions() resolves.

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-zinc-800 ${className}`} />;
}

export function WishCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="mt-4 h-5 w-3/4" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-1 h-4 w-2/3" />
      <Skeleton className="mt-4 h-9 w-full rounded-lg" />
    </div>
  );
}
