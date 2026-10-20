"use client";

import { AudioLines, Bookmark, Grip, ListMusic, LogOut, Sigma } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/modules/auth/client";

import { Disclosure } from "../ui/Disclosure";

const NAV = [
  { href: "/", label: "Identificar", icon: AudioLines },
  { href: "/saved", label: "Guardadas", icon: Bookmark },
  { href: "/playlists", label: "Mis playlists", icon: ListMusic },
  { href: "/how-it-works", label: "Cómo funciona", icon: Sigma },
] as const;

/** First letter of the first two words of the name (UI-R2). */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => Array.from(word)[0] ?? "");
  return letters.join("").toLocaleUpperCase("es") || "?";
}

export function ProfileMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function signOut() {
    setLeaving(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Disclosure
      label={`Perfil de ${name}`}
      triggerClassName="grid h-11 w-11 place-items-center rounded-full bg-[conic-gradient(from_210deg,var(--color-teal),var(--color-violet),var(--color-magenta),var(--color-teal))] p-[2px] transition-transform active:scale-95"
      trigger={
        <span className="grid h-full w-full place-items-center rounded-full bg-ink-1 text-sm font-semibold tracking-wide">
          {initialsOf(name)}
        </span>
      }
      panelClassName="w-72"
    >
      {() => (
        <div>
          <div className="px-3 pb-3 pt-2">
            <p className="truncate font-medium">{name}</p>
            <p className="truncate text-sm text-fg-2">{email}</p>
          </div>
          <div className="h-px bg-hairline" />
          <button
            type="button"
            onClick={signOut}
            disabled={leaving}
            className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-fg transition-colors focus-visible:outline-offset-[-2px] hover:bg-glass-strong disabled:opacity-60"
          >
            <LogOut aria-hidden className="h-[18px] w-[18px] text-fg-2" strokeWidth={1.75} />
            {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      )}
    </Disclosure>
  );
}

export function NavMenu() {
  const pathname = usePathname();
  return (
    <Disclosure
      label="Menú"
      triggerClassName="btn-icon"
      trigger={<Grip aria-hidden className="h-5 w-5" strokeWidth={1.75} />}
      panelClassName="w-64"
    >
      {(close) => (
        <nav aria-label="Principal">
          <ul className="flex flex-col gap-1.5">
            {NAV.map(({ href, label, icon: Icon }) => {
              const current = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={close}
                    aria-current={current ? "page" : undefined}
                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-fg-2 transition-colors focus-visible:outline-offset-[-2px] hover:bg-glass-strong hover:text-fg aria-[current=page]:bg-glass-strong aria-[current=page]:text-fg"
                  >
                    <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </Disclosure>
  );
}
