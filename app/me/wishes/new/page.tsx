import Link from 'next/link';
import { requirePageSession } from '@/lib/session-guard';
import { WishForm } from '@/components/WishForm';

export const dynamic = 'force-dynamic';

export default async function NewWishPage() {
  await requirePageSession();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/me" className="text-sm text-zinc-400 transition duration-200 hover:text-zinc-200">
        ← Volver al panel
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold tracking-tight text-zinc-100">Nuevo deseo</h1>
      <WishForm mode="create" />
    </main>
  );
}
