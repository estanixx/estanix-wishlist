import { Skeleton } from '@/components/Skeleton';

// app/me/wishes/[wishId]/edit/loading.tsx -- route-level Suspense boundary
// while page.tsx's requirePageSession() + getWishWithOptions() resolve,
// same pattern as app/me/loading.tsx. app/me/wishes/new/page.tsx has no
// equivalent loading.tsx: it only awaits requirePageSession() (an in-memory
// cookie/HMAC check, not a network round trip), so there is no meaningful
// Suspense boundary to skeleton there.
export default function EditWishLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mb-6 mt-3 h-8 w-40" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </main>
  );
}
