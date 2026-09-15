import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getWishWithOptions } from '@/lib/wish-repository';
import { VisitCounterEffect } from '@/components/VisitCounterEffect';
import { WishDetail } from '@/components/WishDetail';

// app/shared/[wishId]/page.tsx -- public detail page (spec.md
// `shared-public-ui`, design.md Folder Structure). force-dynamic for the
// same correctness reason as /shared (design.md Decision 6): every visitor,
// including a direct link straight to this page, must see live DynamoDB
// reservation state, never a stale RSC cache.
export const dynamic = 'force-dynamic';

export default async function WishDetailPage({ params }: { params: Promise<{ wishId: string }> }) {
  const { wishId } = await params;
  const wish = await getWishWithOptions(wishId);

  if (!wish) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Direct entry to /shared/:wishId also counts as a visit (locked
          decision, apply-progress instructions) -- same dedup key/component
          as /shared, so a visitor who lands here first is still counted
          exactly once. */}
      <VisitCounterEffect />
      <Link href="/shared" className="mb-6 inline-flex items-center gap-1.5 text-sm text-foreground-muted transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a la lista
      </Link>
      <WishDetail wish={wish} />
    </main>
  );
}
