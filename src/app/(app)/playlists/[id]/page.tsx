import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PlaylistDetail } from "@/app/_components/library/PlaylistDetail";
import { PageLoading } from "@/app/_components/ui/PageLoading";
import { getLibrary } from "@/app/_lib/library";
import { toTrackView } from "@/app/_lib/tracks";
import { requireUser } from "@/modules/auth";
import { NotFoundError } from "@/shared";

export const metadata: Metadata = { title: "Playlist" };

// The session and the data are request data: read them inside Suspense (cacheComponents).
export default function PlaylistPage({ params }: PageProps<"/playlists/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Playlist params={params} />
    </Suspense>
  );
}

async function Playlist({ params }: Pick<PageProps<"/playlists/[id]">, "params">) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  let playlist;
  try {
    playlist = await getLibrary().getPlaylist(user.id, id);
  } catch (error) {
    // Missing and foreign playlists look the same (UI-R21, LIB-R14).
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
      <PlaylistDetail
        playlist={{
          id: playlist.id,
          name: playlist.name,
          tracks: playlist.tracks.map((item) => toTrackView(item.track)),
        }}
      />
    </main>
  );
}
