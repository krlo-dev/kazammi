import { LOGO_PATH, LOGO_VIEWBOX } from "./logo-data";

/** The Mono DJ mark, inline so it takes the text color. Decorative unless `title` is set. */
export function Logo({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path fill="currentColor" fillRule="evenodd" d={LOGO_PATH} />
    </svg>
  );
}
