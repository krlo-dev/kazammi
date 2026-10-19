"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getLibrary, SAVED_PAGE_SIZE } from "@/app/_lib/library";
import { toTrackView, type TrackView } from "@/app/_lib/tracks";
import { requireUser } from "@/modules/auth";
import {
  LimitError,
  NotFoundError,
  playlistIdSchema,
  playlistNameSchema,
  trackIdSchema,
  ValidationError,
} from "@/shared";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: "validation" | "not_found" | "limit" | "unknown"; message: string };

const NOT_FOUND = "No encontramos esa playlist o canción.";

/** Pages that show library data: home ("Mis canciones"), saved tracks and playlists. */
function revalidateLibrary() {
  revalidatePath("/");
  revalidatePath("/saved");
  revalidatePath("/playlists");
  revalidatePath("/playlists/[id]", "page");
}

/**
 * requireUser() -> zod -> service -> revalidate. The userId always comes from the session.
 * requireUser() stays outside the try: its redirect to /login must not become an error.
 */
async function run<A extends unknown[], T>(
  schemas: { [K in keyof A]: z.ZodType<A[K]> },
  args: unknown[],
  action: (userId: string, ...args: A) => Promise<T>,
  { revalidate = true }: { revalidate?: boolean } = {},
): Promise<ActionResult<T>> {
  const user = await requireUser();

  const parsed: unknown[] = [];
  for (let i = 0; i < schemas.length; i++) {
    const result = (schemas[i] as z.ZodType).safeParse(args[i]);
    if (!result.success) {
      // A malformed id cannot name anything of the user: same answer as a missing one.
      return schemas[i] === playlistNameSchema
        ? { ok: false, error: "validation", message: result.error.issues[0].message }
        : { ok: false, error: "not_found", message: NOT_FOUND };
    }
    parsed.push(result.data);
  }

  try {
    const data = await action(user.id, ...(parsed as A));
    if (revalidate) revalidateLibrary();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, error: "validation", message: error.message };
    }
    if (error instanceof NotFoundError) {
      return { ok: false, error: "not_found", message: NOT_FOUND };
    }
    if (error instanceof LimitError) return { ok: false, error: "limit", message: error.message };
    console.error("Library action failed", error);
    return { ok: false, error: "unknown", message: "Algo salió mal. Inténtalo de nuevo." };
  }
}

export async function saveTrackAction(trackId: number): Promise<ActionResult> {
  return run([trackIdSchema], [trackId], (userId, id) => getLibrary().saveTrack(userId, id));
}

export async function unsaveTrackAction(trackId: number): Promise<ActionResult> {
  return run([trackIdSchema], [trackId], (userId, id) => getLibrary().unsaveTrack(userId, id));
}

/** "Nueva playlist" from the result sheet: creates it and, optionally, adds the track. */
export async function createPlaylistAction(
  name: string,
  addTrackId?: number,
): Promise<ActionResult<{ id: string }>> {
  return run(
    [playlistNameSchema, trackIdSchema.optional()],
    [name, addTrackId],
    async (userId, validName, trackId) => {
      const playlist = await getLibrary().createPlaylist(userId, validName);
      if (trackId !== undefined) {
        try {
          await getLibrary().addToPlaylist(userId, playlist.id, trackId);
        } catch (error) {
          // One step for the user: do not leave an empty playlist behind.
          await getLibrary().deletePlaylist(userId, playlist.id);
          throw error;
        }
      }
      return { id: playlist.id };
    },
  );
}

export async function renamePlaylistAction(
  playlistId: string,
  name: string,
): Promise<ActionResult> {
  return run([playlistIdSchema, playlistNameSchema], [playlistId, name], (userId, id, valid) =>
    getLibrary().renamePlaylist(userId, id, valid),
  );
}

export async function deletePlaylistAction(playlistId: string): Promise<ActionResult> {
  return run([playlistIdSchema], [playlistId], (userId, id) =>
    getLibrary().deletePlaylist(userId, id),
  );
}

export async function addToPlaylistAction(
  playlistId: string,
  trackId: number,
): Promise<ActionResult> {
  return run([playlistIdSchema, trackIdSchema], [playlistId, trackId], (userId, id, track) =>
    getLibrary().addToPlaylist(userId, id, track),
  );
}

export async function removeFromPlaylistAction(
  playlistId: string,
  trackId: number,
): Promise<ActionResult> {
  return run([playlistIdSchema, trackIdSchema], [playlistId, trackId], (userId, id, track) =>
    getLibrary().removeFromPlaylist(userId, id, track),
  );
}

/** Reads for the "Agregar a playlist" sheet (LIB-R13). */
export async function playlistsForTrackAction(
  trackId: number,
): Promise<ActionResult<Array<{ id: string; name: string; contains: boolean }>>> {
  return run(
    [trackIdSchema],
    [trackId],
    (userId, id) => getLibrary().playlistsForTrack(userId, id),
    { revalidate: false },
  );
}

/** Next page of saved tracks, for the incremental list of /saved (LIB-R3). */
export async function listSavedAction(
  cursor: string,
): Promise<
  ActionResult<{ items: Array<{ track: TrackView; savedAt: string }>; nextCursor: string | null }>
> {
  return run(
    [z.string().min(1).max(200)],
    [cursor],
    async (userId, value) => {
      const page = await getLibrary().listSaved(userId, { limit: SAVED_PAGE_SIZE, cursor: value });
      return {
        items: page.items.map((item) => ({
          track: toTrackView(item.track),
          savedAt: item.savedAt.toISOString(),
        })),
        nextCursor: page.nextCursor,
      };
    },
    { revalidate: false },
  );
}
