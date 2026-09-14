import type { Option } from '@/lib/types';

// components/ImageMiniGrid.tsx -- preview-only mini grid of a wish's option
// images on the /shared listing card (spec.md `shared-public-ui`: "mini
// image grid of options"). Never individually clickable here -- the whole
// WishCard is the single click target, linking to /shared/:wishId (Phase 3
// owns the per-option detail view).

const MAX_PREVIEW = 4;

type PreviewOption = Pick<Option, 'id' | 'imageUrl' | 'title'>;

export function ImageMiniGrid({ options }: { options: PreviewOption[] }) {
  if (options.length === 0) {
    return <div className="grid h-40 w-full place-items-center bg-zinc-800 text-sm text-zinc-500">Sin opciones todavía</div>;
  }

  if (options.length === 1) {
    const [option] = options;
    return (
      <div className="h-40 w-full overflow-hidden bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element -- external admin-provided URLs, no image-optimization domain allowlist */}
        <img
          src={option.imageUrl}
          alt={option.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
    );
  }

  const preview = options.slice(0, MAX_PREVIEW);
  const remaining = options.length - preview.length;

  return (
    <div className="grid h-40 w-full grid-cols-2 gap-0.5 overflow-hidden bg-zinc-950">
      {preview.map((option, index) => {
        const isLastTile = index === preview.length - 1 && remaining > 0;
        return (
          <div key={option.id} className="relative h-full w-full overflow-hidden bg-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element -- external admin-provided URLs, no image-optimization domain allowlist */}
            <img src={option.imageUrl} alt={option.title} loading="lazy" className="h-full w-full object-cover" />
            {isLastTile && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-medium text-white">
                +{remaining}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
