import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { tracks, user, type Database } from "@/modules/db";
import { createTestDb } from "@/modules/db/testing";
import { createLibraryService } from "@/modules/library";

const state = vi.hoisted(() => ({
  db: undefined as unknown,
  userId: null as string | null,
}));

vi.mock("@/modules/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/db")>()),
  getDb: () => state.db,
}));
vi.mock("@/modules/auth", () => ({
  requireUser: async () => {
    // Same contract as the real one: no session means a redirect, which throws.
    if (!state.userId) throw new Error("NEXT_REDIRECT /login");
    return { id: state.userId, name: "Test", email: `${state.userId}@example.com` };
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { revalidatePath } = await import("next/cache");
const actions = await import("../library");

describe("library server actions", () => {
  let close: () => Promise<void>;
  let db: Database;
  let trackId: number;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
    state.db = db;
    await db.insert(user).values([
      { id: "a", name: "Ana", email: "a@example.com" },
      { id: "b", name: "Beto", email: "b@example.com" },
    ]);
    [{ id: trackId }] = await db
      .insert(tracks)
      .values({
        sourcePath: "song.mp3",
        contentSha256: "sha",
        title: "Song",
        artist: "Artist",
        durationSec: 100,
        fingerprintVersion: 2,
        hashCount: 0,
      })
      .returning({ id: tracks.id });
  });
  afterAll(() => close());
  beforeEach(() => {
    state.userId = "a";
    vi.mocked(revalidatePath).mockClear();
  });

  const library = () => createLibraryService(db);

  it("saves for the session user and revalidates the library pages", async () => {
    expect(await actions.saveTrackAction(trackId)).toEqual({ ok: true, data: undefined });
    expect(await library().isSaved("a", trackId)).toBe(true);
    expect(await library().isSaved("b", trackId)).toBe(false);
    expect(revalidatePath).toHaveBeenCalledWith("/saved");
    expect(revalidatePath).toHaveBeenCalledWith("/playlists/[id]", "page");

    expect(await actions.unsaveTrackAction(trackId)).toMatchObject({ ok: true });
    expect(await library().isSaved("a", trackId)).toBe(false);
  });

  it("without a session it redirects instead of answering", async () => {
    state.userId = null;
    await expect(actions.saveTrackAction(trackId)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("answers validation with the Spanish message for a bad name", async () => {
    expect(await actions.createPlaylistAction("guardadas")).toEqual({
      ok: false,
      error: "validation",
      message: '"Guardadas" es el nombre de tu playlist general.',
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers not_found for malformed ids and for missing tracks", async () => {
    expect(await actions.saveTrackAction(-1)).toMatchObject({ ok: false, error: "not_found" });
    expect(await actions.saveTrackAction(999_999)).toMatchObject({
      ok: false,
      error: "not_found",
    });
    expect(await actions.deletePlaylistAction("nope")).toMatchObject({
      ok: false,
      error: "not_found",
    });
  });

  it("creates a playlist and adds the track in one step", async () => {
    const result = await actions.createPlaylistAction("Para entrenar", trackId);
    if (!result.ok) throw new Error(result.message);
    const detail = await library().getPlaylist("a", result.data.id);
    expect(detail.tracks.map((item) => item.track.id)).toEqual([trackId]);
    expect(await library().isSaved("a", trackId)).toBe(true);
  });

  it("does not leave an empty playlist when the track cannot be added", async () => {
    expect(await actions.createPlaylistAction("Fantasma", 999_999)).toMatchObject({
      ok: false,
      error: "not_found",
    });
    const names = (await library().listPlaylists("a")).map((p) => p.name);
    expect(names).not.toContain("Fantasma");
  });

  it("renames, adds, removes and deletes, scoped to the session user", async () => {
    const created = await actions.createPlaylistAction("Rock");
    if (!created.ok) throw new Error(created.message);
    const id = created.data.id;

    expect(await actions.renamePlaylistAction(id, "Rock clásico")).toMatchObject({ ok: true });
    expect(await actions.addToPlaylistAction(id, trackId)).toMatchObject({ ok: true });

    state.userId = "b";
    for (const result of [
      await actions.renamePlaylistAction(id, "Mío"),
      await actions.addToPlaylistAction(id, trackId),
      await actions.removeFromPlaylistAction(id, trackId),
      await actions.deletePlaylistAction(id),
    ]) {
      expect(result).toEqual({
        ok: false,
        error: "not_found",
        message: "No encontramos esa playlist o canción.",
      });
    }

    state.userId = "a";
    expect(await actions.removeFromPlaylistAction(id, trackId)).toMatchObject({ ok: true });
    expect(await actions.deletePlaylistAction(id)).toMatchObject({ ok: true });
    expect((await library().listPlaylists("a")).map((p) => p.name)).not.toContain("Rock clásico");
  });

  it("answers unknown, without details, when the database fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const realDb = state.db;
    state.db = undefined;
    vi.resetModules();
    const fresh = await import("../library");
    expect(await fresh.saveTrackAction(trackId)).toEqual({
      ok: false,
      error: "unknown",
      message: "Algo salió mal. Inténtalo de nuevo.",
    });
    expect(consoleError).toHaveBeenCalled();
    state.db = realDb;
    consoleError.mockRestore();
  });
});
