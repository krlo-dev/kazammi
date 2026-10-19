import { ListMusic } from "lucide-react";

/**
 * Up to 4 covers in a square (LIB-R7): 1 fills it, 2 split it, 3 and 4 make a grid.
 * The images are decorative: the card's name carries the meaning.
 */
export function Mosaic({ trackIds, className = "" }: { trackIds: number[]; className?: string }) {
  const ids = trackIds.slice(0, 4);
  if (ids.length === 0) {
    return (
      <div
        aria-hidden
        className={`grid aspect-square place-items-center bg-[radial-gradient(120%_120%_at_15%_10%,rgb(31_209_165/0.35)_0%,rgb(96_54_164/0.55)_45%,var(--color-ink-2)_100%)] ${className}`}
      >
        <ListMusic className="h-1/4 w-1/4 text-white/75" strokeWidth={1.5} />
      </div>
    );
  }
  const layout = ids.length === 1 ? "grid-cols-1" : "grid-cols-2 grid-rows-2";
  return (
    <div
      aria-hidden
      className={`grid aspect-square gap-0.5 overflow-hidden bg-ink-2 ${layout} ${className}`}
    >
      {ids.map((id, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- session-protected route, decorative
        <img
          key={id}
          src={`/api/tracks/${id}/cover`}
          alt=""
          loading="lazy"
          className={`h-full w-full object-cover ${
            ids.length === 2 ? "row-span-2" : ids.length === 3 && i === 0 ? "row-span-2" : ""
          }`}
        />
      ))}
    </div>
  );
}
