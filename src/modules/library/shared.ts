import { tracks } from "@/modules/db";
import { NotFoundError, playlistIdSchema, playlistNameSchema, ValidationError } from "@/shared";

/** Columns of a catalog Track, for joins from the library tables. */
export const trackColumns = {
  id: tracks.id,
  title: tracks.title,
  artist: tracks.artist,
  album: tracks.album,
  genre: tracks.genre,
  year: tracks.year,
  durationSec: tracks.durationSec,
  hasCover: tracks.hasCover,
};

/** SQLSTATE of a Postgres error, also when Drizzle wraps it (postgres.js and PGlite). */
export function pgErrorCode(error: unknown): string | undefined {
  for (let e: unknown = error; e instanceof Object; e = (e as { cause?: unknown }).cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export const FOREIGN_KEY_VIOLATION = "23503";
export const UNIQUE_VIOLATION = "23505";

/** A malformed id cannot name an existing playlist: same answer as a missing one. */
export function assertPlaylistId(playlistId: string): void {
  if (!playlistIdSchema.safeParse(playlistId).success) {
    throw new NotFoundError("Playlist not found");
  }
}

export function validPlaylistName(name: string): string {
  const parsed = playlistNameSchema.safeParse(name);
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0].message);
  return parsed.data;
}
