import { and, desc, eq, sql } from "drizzle-orm";

import { savedTracks, tracks, type Database } from "@/modules/db";
import { NotFoundError, ValidationError } from "@/shared";

import { FOREIGN_KEY_VIOLATION, pgErrorCode, trackColumns } from "./shared";
import type { Page, SavedTrack } from "./types";

export const RECENT_SAVED = 5;
const MAX_PAGE = 100;

/** Idempotent (LIB-R1). A track that does not exist is a NotFoundError. */
export async function saveTrack(db: Database, userId: string, trackId: number): Promise<void> {
  try {
    await db.insert(savedTracks).values({ userId, trackId }).onConflictDoNothing();
  } catch (error) {
    if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) throw new NotFoundError("Track not found");
    throw error;
  }
}

/** Also removes the track from every playlist of the user, through ON DELETE CASCADE (LIB-R2). */
export async function unsaveTrack(db: Database, userId: string, trackId: number): Promise<void> {
  await db
    .delete(savedTracks)
    .where(and(eq(savedTracks.userId, userId), eq(savedTracks.trackId, trackId)));
}

export async function isSaved(db: Database, userId: string, trackId: number): Promise<boolean> {
  const rows = await db
    .select({ trackId: savedTracks.trackId })
    .from(savedTracks)
    .where(and(eq(savedTracks.userId, userId), eq(savedTracks.trackId, trackId)))
    .limit(1);
  return rows.length > 0;
}

/**
 * The cursor keeps saved_at as Postgres text: a JS Date only has milliseconds and
 * saved_at has microseconds, so a Date cursor would repeat rows between pages.
 */
interface Cursor {
  savedAt: string;
  trackId: number;
}

const encodeCursor = (cursor: Cursor) =>
  Buffer.from(JSON.stringify([cursor.savedAt, cursor.trackId])).toString("base64url");

function decodeCursor(value: string): Cursor {
  try {
    const [savedAt, trackId] = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof savedAt === "string" && Number.isInteger(trackId)) return { savedAt, trackId };
  } catch {
    // Falls through to the validation error.
  }
  throw new ValidationError("Cursor inválido.");
}

/** Newest first, keyset pagination on (saved_at, track_id) (LIB-R3). */
export async function listSaved(
  db: Database,
  userId: string,
  opts: { limit: number; cursor?: string },
): Promise<Page<SavedTrack>> {
  const limit = Math.min(Math.max(Math.trunc(opts.limit), 1), MAX_PAGE);
  const cursor = opts.cursor ? decodeCursor(opts.cursor) : undefined;

  const rows = await db
    .select({
      track: trackColumns,
      savedAt: savedTracks.savedAt,
      savedAtText: sql<string>`${savedTracks.savedAt}::text`,
    })
    .from(savedTracks)
    .innerJoin(tracks, eq(tracks.id, savedTracks.trackId))
    .where(
      and(
        eq(savedTracks.userId, userId),
        cursor
          ? sql`(${savedTracks.savedAt}, ${savedTracks.trackId}) < (${cursor.savedAt}::timestamptz, ${cursor.trackId})`
          : undefined,
      ),
    )
    .orderBy(desc(savedTracks.savedAt), desc(savedTracks.trackId))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page.map(({ track, savedAt }) => ({ track, savedAt })),
    nextCursor:
      rows.length > limit && last
        ? encodeCursor({ savedAt: last.savedAtText, trackId: last.track.id })
        : null,
  };
}

/** The latest saved tracks, for "Mis canciones" on the home screen (LIB-R5). */
export async function recentSaved(
  db: Database,
  userId: string,
  limit = RECENT_SAVED,
): Promise<SavedTrack[]> {
  return (await listSaved(db, userId, { limit })).items;
}
