import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Mosaic } from "@/app/_components/library/Mosaic";
import { NewPlaylistButton } from "@/app/_components/library/NewPlaylistButton";
import { PageTitle } from "@/app/_components/library/PageTitle";
import { PageLoading } from "@/app/_components/ui/PageLoading";
import { getLibrary } from "@/app/_lib/library";
import { requireUser } from "@/modules/auth";

export const metadata: Metadata = { title: "Mis playlists" };

const songs = (n: number) => (n === 1 ? "1 canción" : `${n} canciones`);

// The session and the data are request data: read them inside Suspense (cacheComponents).
export default function PlaylistsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Playlists />
    </Suspense>
  );
}

async function Playlists() {
  const user = await requireUser();
  const library = getLibrary();
  const [playlists, recent] = await Promise.all([
    library.listPlaylists(user.id),
    library.recentSaved(user.id, 4),
  ]);
  const savedCovers = recent.filter((item) => item.track.hasCover).map((item) => item.track.id);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pt-12">
      <PageTitle first="Mis" second="playlists" actions={<NewPlaylistButton />} />

      <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        <li>
          <PlaylistCard
            href="/saved"
            name="Guardadas"
            detail="Tu playlist general"
            coverIds={savedCovers}
            featured
          />
        </li>
        {playlists.map((playlist) => (
          <li key={playlist.id}>
            <PlaylistCard
              href={`/playlists/${playlist.id}`}
              name={playlist.name}
              detail={songs(playlist.trackCount)}
              coverIds={playlist.coverTrackIds}
            />
          </li>
        ))}
      </ul>

      {playlists.length === 0 && (
        <div className="glass mt-10 flex flex-col items-start gap-4 rounded-[1.5rem] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">Arma tu primera playlist</h2>
            <p className="mt-1 text-fg-2">
              Crea una aquí, o identifica una canción y toca Agregar a playlist.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <NewPlaylistButton variant="primary" />
            <Link href="/" className="btn-pill">
              Ir a Identificar
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function PlaylistCard({
  href,
  name,
  detail,
  coverIds,
  featured = false,
}: {
  href: string;
  name: string;
  detail: string;
  coverIds: number[];
  featured?: boolean;
}) {
  return (
    <Link href={href} className="group block rounded-[1.5rem]">
      <div
        className={`relative overflow-hidden rounded-[1.5rem] border transition-transform duration-300 ease-[var(--ease-out-quart)] group-hover:-translate-y-1 ${
          featured
            ? "border-transparent shadow-[0_0_0_1.5px_rgb(31_209_165/0.55),0_24px_48px_-24px_rgb(96_54_164/0.9)]"
            : "border-hairline shadow-[0_24px_48px_-28px_rgb(0_0_0/0.9)]"
        }`}
      >
        <Mosaic trackIds={coverIds} />
      </div>
      <p className="mt-3 truncate font-medium">{name}</p>
      <p className="truncate text-sm text-fg-2">{detail}</p>
    </Link>
  );
}
