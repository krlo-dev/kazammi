import { and, asc, count, desc, eq, sql } from "drizzle-orm";

import { playlists, playlistTracks, savedTracks, tracks, type Database } from "@/modules/db";
import {
  LimitError,
  MAX_PLAYLISTS_PER_USER,
  MAX_TRACKS_PER_PLAYLIST,
  NotFoundError,
  ValidationError,
} from "@/shared";

import {
  assertPlaylistId,
  FOREIGN_KEY_VIOLATION,
  pgErrorCode,
  trackColumns,
  UNIQUE_VIOLATION,
  validPlaylistName,
} from "./shared";
import type { PlaylistDetail, PlaylistSummary } from "./types";

const DUPLICATE_NAME = "Ya tienes una playlist con ese nombre.";
const notFound = () => new NotFoundError("Playlist not found");

// The correlated subqueries name playlists.id by hand: in a single-table select Drizzle
// renders ${playlists.id} as a bare "id", which would bind to tracks.id inside them.
const summaryColumns = {
  id: playlists.id,
  name: playlists.name,
  trackCount: sql<number>`(
    SELECT count(*)::int FROM playlist_tracks pt WHERE pt.playlist_id = playlists.id
  )`,
  coverTrackIds: sql<number[]>`coalesce((
    SELECT array_agg(c.track_id ORDER BY c.added_at, c.track_id)
    FROM (
      SELECT pt.track_id, pt.added_at
      FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
      WHERE pt.playlist_id = playlists.id AND t.has_cover
      ORDER BY pt.added_at, pt.track_id
      LIMIT 4
    ) c
  ), '{}')`,
};

/** Every query is scoped to the owner: another user's playlist reads as missing (LIB-R14). */
const owned = (userId: string, playlistId: string) =>
  and(eq(playlists.id, playlistId), eq(playlists.userId, userId));

async function translateNameConflict<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) throw new ValidationError(DUPLICATE_NAME);
    throw error;
  }
}

/** Most recently changed first, with the track count and the mosaic covers (LIB-R7). */
export async function listPlaylists(db: Database, userId: string): Promise<PlaylistSummary[]> {
  return db
    .select(summaryColumns)
    .from(playlists)
    .where(eq(playlists.userId, userId))
    .orderBy(desc(playlists.updatedAt), desc(playlists.createdAt));
}

/** Tracks in the order they were added (LIB-R8). */
export async function getPlaylist(
  db: Database,
  userId: string,
  playlistId: string,
): Promise<PlaylistDetail> {
  assertPlaylistId(playlistId);
  const [summary] = await db
    .select(summaryColumns)
    .from(playlists)
    .where(owned(userId, playlistId));
  if (!summary) throw notFound();

  const rows = await db
    .select({ track: trackColumns, addedAt: playlistTracks.addedAt })
    .from(playlistTracks)
    .innerJoin(tracks, eq(tracks.id, playlistTracks.trackId))
    .where(eq(playlistTracks.playlistId, playlistId))
    .orderBy(asc(playlistTracks.addedAt), asc(playlistTracks.trackId));
  return { ...summary, tracks: rows };
}

/** LIB-R6 and the 50 playlists quota of LIB-R16. */
export async function createPlaylist(
  db: Database,
  userId: string,
  name: string,
): Promise<PlaylistSummary> {
  const valid = validPlaylistName(name);
  const [{ total }] = await db
    .select({ total: count() })
    .from(playlists)
    .where(eq(playlists.userId, userId));
  if (total >= MAX_PLAYLISTS_PER_USER) {
    throw new LimitError(`Puedes tener hasta ${MAX_PLAYLISTS_PER_USER} playlists.`);
  }
  const [row] = await translateNameConflict(() =>
    db
      .insert(playlists)
      .values({ userId, name: valid })
      .returning({ id: playlists.id, name: playlists.name }),
  );
  return { ...row, trackCount: 0, coverTrackIds: [] };
}

export async function renamePlaylist(
  db: Database,
  userId: string,
  playlistId: string,
  name: string,
): Promise<void> {
  assertPlaylistId(playlistId);
  const valid = validPlaylistName(name);
  const rows = await translateNameConflict(() =>
    db
      .update(playlists)
      .set({ name: valid, updatedAt: sql`now()` })
      .where(owned(userId, playlistId))
      .returning({ id: playlists.id }),
  );
  if (rows.length === 0) throw notFound();
}

/** The tracks stay in the saved tracks (LIB-R11). */
export async function deletePlaylist(
  db: Database,
  userId: string,
  playlistId: string,
): Promise<void> {
  assertPlaylistId(playlistId);
  const rows = await db
    .delete(playlists)
    .where(owned(userId, playlistId))
    .returning({ id: playlists.id });
  if (rows.length === 0) throw notFound();
}

/**
 * Saves the track and adds it to the playlist in one transaction (LIB-R9), within the
 * 500 tracks quota of LIB-R16. Adding a track that is already there has no effect.
 */
export async function addToPlaylist(
  db: Database,
  userId: string,
  playlistId: string,
  trackId: number,
): Promise<void> {
  assertPlaylistId(playlistId);
  await db.transaction(async (tx) => {
    const [playlist] = await tx
      .select({ id: playlists.id })
      .from(playlists)
      .where(owned(userId, playlistId))
      .for("update");
    if (!playlist) throw notFound();

    const [{ total, present }] = await tx
      .select({
        total: count(),
        present: sql<boolean>`coalesce(bool_or(${playlistTracks.trackId} = ${trackId}), false)`,
      })
      .from(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlistId));
    if (present) return;
    if (total >= MAX_TRACKS_PER_PLAYLIST) {
      throw new LimitError(`Una playlist puede tener hasta ${MAX_TRACKS_PER_PLAYLIST} canciones.`);
    }

    try {
      await tx.insert(savedTracks).values({ userId, trackId }).onConflictDoNothing();
    } catch (error) {
      if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) {
        throw new NotFoundError("Track not found");
      }
      throw error;
    }
    await tx.insert(playlistTracks).values({ playlistId, userId, trackId }).onConflictDoNothing();
    await tx
      .update(playlists)
      .set({ updatedAt: sql`now()` })
      .where(eq(playlists.id, playlistId));
  });
}

/** The track stays in the saved tracks (LIB-R10). */
export async function removeFromPlaylist(
  db: Database,
  userId: string,
  playlistId: string,
  trackId: number,
): Promise<void> {
  assertPlaylistId(playlistId);
  const [playlist] = await db
    .select({ id: playlists.id })
    .from(playlists)
    .where(owned(userId, playlistId));
  if (!playlist) throw notFound();
  await db
    .delete(playlistTracks)
    .where(and(eq(playlistTracks.playlistId, playlistId), eq(playlistTracks.trackId, trackId)));
}

/** The user's playlists, marking the ones that already hold the track (LIB-R13). */
export async function playlistsForTrack(
  db: Database,
  userId: string,
  trackId: number,
): Promise<Array<{ id: string; name: string; contains: boolean }>> {
  return db
    .select({
      id: playlists.id,
      name: playlists.name,
      contains: sql<boolean>`exists (
        SELECT 1 FROM playlist_tracks pt
        WHERE pt.playlist_id = playlists.id AND pt.track_id = ${trackId}
      )`,
    })
    .from(playlists)
    .where(eq(playlists.userId, userId))
    .orderBy(desc(playlists.updatedAt), desc(playlists.createdAt));
}
