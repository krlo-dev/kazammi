import Link from "next/link";

import { Logo } from "./_components/brand/Logo";

/** Unmatched URLs, outside the (app) shell. */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div aria-hidden className="app-field" />
      <Logo className="h-16 w-16 text-fg-2" />
      <h1 className="display text-5xl">
        Página <span className="text-fg-2">no encontrada</span>
      </h1>
      <Link href="/" className="btn-primary rounded-full">
        Ir a Kazammi
      </Link>
    </main>
  );
}
