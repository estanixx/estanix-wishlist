import { listWishesWithOptions } from '@/lib/wish-repository';
import { WishGrid } from '@/components/WishGrid';
import { VisitCounterEffect } from '@/components/VisitCounterEffect';

// app/shared/page.tsx -- public listing (spec.md `shared-public-ui`,
// design.md Folder Structure). force-dynamic is a correctness requirement,
// not a perf tune (design.md Decision 6): the App Router caches RSC renders
// by default, and every visitor must see live DynamoDB reserved state.
export const dynamic = 'force-dynamic';

export default async function SharedPage() {
  // Server Component reads the repository directly -- GET /api/wishes
  // (design.md's `wish-catalog` API) exists for external/client consumers,
  // not for this page's own render, so no self-fetch round trip is added.
  const wishes = await listWishesWithOptions();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <VisitCounterEffect />
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Lista de deseos de Juanes</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Elige un regalo y reservalo para que nadie más lo repita. Muchas gracias por tomarte el tiempo 😁
        </p>
      </header>
      <WishGrid wishes={wishes} />
    </main>
  );
}
