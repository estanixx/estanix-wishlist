import type { Option, Wish } from '@/lib/types';
import { canReserveOption } from '@/lib/wish-state';
import { ExternalLinkButton } from './ExternalLinkButton';
import { ReservedBand } from './ReservedBand';
import { ReserveButton } from './ReserveButton';

// components/SingleOptionLayout.tsx -- spec.md §6.2, locked: when a wish has
// exactly ONE option, do NOT render it as an independent card -- integrate
// its image/description/link directly into the wish page layout (no
// redundant title/card, the wish's own title already covers it), but keep
// "Regalaré esto" and "Ir al sitio". Same band/button rules as OptionCard,
// just without the nested card wrapper or the option's own title.
export function SingleOptionLayout({ wish, option }: { wish: Wish; option: Option }) {
  const showBand = option.reserved && !wish.oneIsEnough;
  const showButton = wish.reservable && !option.reserved;
  const buttonDisabled = showButton && !canReserveOption(wish, option);

  return (
    <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 sm:flex-row">
      {showBand && <ReservedBand label="Opción reservada" />}
      <a
        href={option.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-56 w-full shrink-0 overflow-hidden bg-zinc-800 sm:h-auto sm:w-72"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- external admin-provided URLs, no image-optimization domain allowlist */}
        <img
          src={option.imageUrl}
          alt={wish.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 hover:scale-105"
        />
      </a>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:py-6 sm:pl-0 sm:pr-6">
        <p className="text-base leading-relaxed text-zinc-300">{option.description}</p>
        <div className="mt-auto flex flex-wrap gap-3">
          <ExternalLinkButton href={option.link} />
          {showButton && <ReserveButton wishId={wish.id} optionId={option.id} disabled={buttonDisabled} />}
        </div>
      </div>
    </div>
  );
}
