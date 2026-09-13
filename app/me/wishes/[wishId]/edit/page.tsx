import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageSession } from '@/lib/session-guard';
import { getWishWithOptions } from '@/lib/wish-repository';
import { WishForm } from '@/components/WishForm';

export const dynamic = 'force-dynamic';

export default async function EditWishPage({ params }: { params: Promise<{ wishId: string }> }) {
  await requirePageSession();

  const { wishId } = await params;
  const wish = await getWishWithOptions(wishId);
  if (!wish) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/me" className="text-sm text-zinc-400 transition duration-200 hover:text-zinc-200">
        ← Volver al panel
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold tracking-tight text-zinc-100">Editar deseo</h1>
      <WishForm mode="edit" wish={wish} />
    </main>
  );
}
