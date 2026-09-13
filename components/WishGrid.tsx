import type { WishWithOptions } from '@/lib/types';
import { WishCard } from './WishCard';

// components/WishGrid.tsx -- mobile-first responsive grid: 1 column on
// mobile, growing up to 4 columns on wide desktop viewports (spec.md /
// SPEC.md §8's responsive requirement).
export function WishGrid({ wishes }: { wishes: WishWithOptions[] }) {
  if (wishes.length === 0) {
    return <p className="py-16 text-center text-sm text-zinc-500">Todavía no hay deseos para mostrar.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {wishes.map(wish => (
        <WishCard key={wish.id} wish={wish} />
      ))}
    </div>
  );
}
