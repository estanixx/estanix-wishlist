import type { Option, Wish } from '@/lib/types';
import { canReserveOption } from '@/lib/wish-state';
import { ExternalLinkButton } from './ExternalLinkButton';
import { ReservedBand } from './ReservedBand';
import { ReserveButton } from './ReserveButton';

// components/OptionCard.tsx -- one option card on /shared/:wishId when the
// wish has multiple options (spec.md §6.2). Image is clickable (same
// target="_blank" rel="noopener noreferrer" as ExternalLinkButton), title,
// description, "Ir al sitio", "Regalaré esto".
//
// Per-card band vs page-level message split (spec.md, locked):
//   - oneIsEnough=false, this option reserved -> show ReservedBand here.
//   - oneIsEnough=true                        -> never band per card, the
//     page-level message (components/WishDetail.tsx) covers it alone.
export function OptionCard({ wish, option }: { wish: Wish; option: Option }) {
  const showBand = option.reserved && !wish.oneIsEnough;
  const showButton = wish.reservable && !option.reserved;
  const buttonDisabled = showButton && !canReserveOption(wish, option);

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      {showBand && <ReservedBand label="Opción reservada" />}
      <a href={option.link} target="_blank" rel="noopener noreferrer" className="block h-48 w-full overflow-hidden bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element -- external admin-provided URLs, no image-optimization domain allowlist */}
        <img
          src={option.imageUrl}
          alt={option.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 hover:scale-105"
        />
      </a>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-lg font-semibold text-zinc-100">{option.title}</h3>
        <p className="flex-1 text-sm leading-relaxed text-zinc-400">{option.description}</p>
        <div className="mt-2 flex flex-wrap gap-3">
          <ExternalLinkButton href={option.link} />
          {showButton && <ReserveButton wishId={wish.id} optionId={option.id} disabled={buttonDisabled} />}
        </div>
      </div>
    </div>
  );
}
