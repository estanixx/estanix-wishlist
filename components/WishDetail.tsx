import type { WishWithOptions } from '@/lib/types';
import { deriveWishState } from '@/lib/wish-state';
import { OptionCard } from './OptionCard';
import { SingleOptionLayout } from './SingleOptionLayout';

// components/WishDetail.tsx -- pure composition/decision layer for
// /shared/[wishId] (spec.md §6.2/§6.3). Kept separate from
// app/shared/[wishId]/page.tsx (a Server Component that only fetches data)
// so the single-option-vs-multi-option decision and the page-level
// "YA RESERVADO" message can be unit-tested with plain fixtures, with no
// DynamoDB/module mocking required. Not in tasks.md's literal component
// list -- same justified addition as Phase 2's VisitCounterEffect (testable
// client boundary / composition layer beyond the literal task-list names).
export function WishDetail({ wish }: { wish: WishWithOptions }) {
  const { fullyReserved } = deriveWishState(wish);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{wish.title}</h1>
        <p className="mt-2 text-base leading-relaxed text-foreground-muted">{wish.description}</p>
      </header>

      {fullyReserved && (
        <div
          role="status"
          className="animate-fade-in rounded-xl border border-danger-accent/30 bg-danger-accent/10 px-4 py-3 text-sm font-medium text-danger-hover"
        >
          Ya reservado — alguien ya reservó este deseo.
        </div>
      )}

      {wish.options.length === 0 && <p className="text-sm text-foreground-faint">Todavía no hay opciones para este deseo.</p>}

      {wish.options.length === 1 && <SingleOptionLayout wish={wish} option={wish.options[0]} />}

      {wish.options.length > 1 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {wish.options.map(option => (
            <OptionCard key={option.id} wish={wish} option={option} />
          ))}
        </div>
      )}
    </div>
  );
}
