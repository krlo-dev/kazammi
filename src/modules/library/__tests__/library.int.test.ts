import { and, eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { playlists, playlistTracks, savedTracks, tracks, user, type Database } from "@/modules/db";
import { createTestDb } from "@/modules/db/testing";
import {
  LimitError,
  MAX_PLAYLISTS_PER_USER,
  MAX_TRACKS_PER_PLAYLIST,
  NotFoundError,
  ValidationError,
} from "@/shared";

import { createLibraryService, type LibraryService } from "../index";

const A = "user-a";
const B = "user-b";
const MISSING_UUID = "00000000-0000-4000-8000-000000000000";

/** PGlite timestamps have millisecond resolution: wait so ordered writes get distinct times. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 2));

describe("library service (PGlite)", () => {
  let db: Database;
  let close: () => Promise<void>;
  let library: LibraryService;
  /** Track ids 1..6; odd ones have a cover. */
  let ids: number[];

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    library = createLibraryService(db);
    await db.insert(user).values([
      { id: A, name: "Ana", email: "ana@example.com" },
      { id: B, name: "Beto", email: "beto@example.com" },
    ]);
    const rows = await db
      .insert(tracks)
      .values(
        Array.from({ length: 6 }, (_, i) => ({
          sourcePath: `song-${i + 1}.mp3`,
          contentSha256: `sha-${i + 1}`,
          title: `Song ${i + 1}`,
          artist: "Artist",
          durationSec: 200,
          hasCover: i % 2 === 0,
          fingerprintVersion: 2,
          hashCount: 0,
        })),
      )
      .returning({ id: tracks.id });
    ids = rows.map((row) => row.id);
  });
  afterEach(() => close());

  const savedIds = async (userId: string) =>
    (await library.listSaved(userId, { limit: 100 })).items.map((item) => item.track.id);
  const playlistTrackIds = async (userId: string, playlistId: string) =>
    (await library.getPlaylist(userId, playlistId)).tracks.map((item) => item.track.id);

  describe("schema (T1)", () => {
    it("rejects a playlist_tracks row whose track is not in saved_tracks (LIB-R15)", async () => {
      const { id } = await library.createPlaylist(A, "Para entrenar");
      await expect(
        db.insert(playlistTracks).values({ playlistId: id, userId: A, trackId: ids[0] }),
      ).rejects.toThrow();
    });

    it("rejects a playlist_tracks row that claims another owner", async () => {
      const { id } = await library.createPlaylist(A, "Para entrenar");
      await library.saveTrack(B, ids[0]);
      await expect(
        db.insert(playlistTracks).values({ playlistId: id, userId: B, trackId: ids[0] }),
      ).rejects.toThrow();
    });

    it("enforces the name length and the case-insensitive uniqueness in the database", async () => {
      await expect(
        db.execute(sql`INSERT INTO playlists (user_id, name) VALUES (${A}, '')`),
      ).rejects.toThrow();
      await db.execute(sql`INSERT INTO playlists (user_id, name) VALUES (${A}, 'Rock')`);
      await expect(
        db.execute(sql`INSERT INTO playlists (user_id, name) VALUES (${A}, 'ROCK')`),
      ).rejects.toThrow();
    });

    it("deleting a catalog track removes it from saved tracks and playlists", async () => {
      const { id } = await library.createPlaylist(A, "Rock");
      await library.addToPlaylist(A, id, ids[0]);
      await db.delete(tracks).where(eq(tracks.id, ids[0]));
      expect(await savedIds(A)).toEqual([]);
      expect(await playlistTrackIds(A, id)).toEqual([]);
    });
  });

  describe("saved tracks (T2)", () => {
    it("saving twice leaves a single row (LIB-R1)", async () => {
      await library.saveTrack(A, ids[0]);
      await library.saveTrack(A, ids[0]);
      const rows = await db
        .select()
        .from(savedTracks)
        .where(and(eq(savedTracks.userId, A), eq(savedTracks.trackId, ids[0])));
      expect(rows).toHaveLength(1);
    });

    it("saving a track that does not exist is not found", async () => {
      await expect(library.saveTrack(A, 999_999)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("isSaved tells whether the track is in the user's saved tracks (LIB-R4)", async () => {
      await library.saveTrack(A, ids[0]);
      expect(await library.isSaved(A, ids[0])).toBe(true);
      expect(await library.isSaved(A, ids[1])).toBe(false);
      expect(await library.isSaved(B, ids[0])).toBe(false);
    });

    it("unsaving removes the track from saved tracks and from every playlist (LIB-R2)", async () => {
      const rock = await library.createPlaylist(A, "Rock");
      const gym = await library.createPlaylist(A, "Gym");
      await library.addToPlaylist(A, rock.id, ids[0]);
      await library.addToPlaylist(A, gym.id, ids[0]);
      await library.addToPlaylist(A, gym.id, ids[1]);

      await library.unsaveTrack(A, ids[0]);

      expect(await library.isSaved(A, ids[0])).toBe(false);
      expect(await playlistTrackIds(A, rock.id)).toEqual([]);
      expect(await playlistTrackIds(A, gym.id)).toEqual([ids[1]]);
    });

    it("lists newest first with a cursor that neither repeats nor skips (LIB-R3)", async () => {
      for (const id of ids) {
        await library.saveTrack(A, id);
        await tick();
      }
      const expected = [...ids].reverse();

      const seen: number[] = [];
      let cursor: string | undefined;
      do {
        const page = await library.listSaved(A, { limit: 4, cursor });
        expect(page.items.length).toBeLessThanOrEqual(4);
        seen.push(...page.items.map((item) => item.track.id));
        cursor = page.nextCursor ?? undefined;
      } while (cursor);

      expect(seen).toEqual(expected);
    });

    it("breaks ties on saved_at by track id", async () => {
      // One transaction: now() is the same for every row.
      await db.transaction(async (tx) => {
        for (const id of ids) await tx.insert(savedTracks).values({ userId: A, trackId: id });
      });
      const first = await library.listSaved(A, { limit: 3 });
      const second = await library.listSaved(A, { limit: 3, cursor: first.nextCursor! });
      expect([...first.items, ...second.items].map((item) => item.track.id)).toEqual(
        [...ids].reverse(),
      );
      expect(second.nextCursor).toBeNull();
    });

    it("returns the track data and the saved date", async () => {
      await library.saveTrack(A, ids[0]);
      const [item] = (await library.listSaved(A, { limit: 10 })).items;
      expect(item.track).toEqual({
        id: ids[0],
        title: "Song 1",
        artist: "Artist",
        album: null,
        genre: null,
        year: null,
        durationSec: 200,
        hasCover: true,
        hasPreview: false,
      });
      expect(item.savedAt).toBeInstanceOf(Date);
    });

    it("rejects a malformed cursor", async () => {
      await expect(library.listSaved(A, { limit: 5, cursor: "nope" })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it("recentSaved returns the last 5 (LIB-R5)", async () => {
      for (const id of [...ids].reverse()) {
        await library.saveTrack(A, id);
        await tick();
      }
      const recent = await library.recentSaved(A);
      // Saved from the last id to the first: newest first is the ids in ascending order.
      expect(recent.map((item) => item.track.id)).toEqual(ids.slice(0, 5));
    });
  });

  describe("playlists (T3)", () => {
    it("creates a playlist with a trimmed name (LIB-R6)", async () => {
      const created = await library.createPlaylist(A, "  Para entrenar ");
      expect(created).toEqual({
        id: expect.any(String),
        name: "Para entrenar",
        trackCount: 0,
        coverTrackIds: [],
      });
    });

    it.each([
      ["an empty name", "   "],
      ["a name over 60 characters", "x".repeat(61)],
      ["the reserved name", "guardadas"],
      ["the reserved name with other case", " GUARDADAS "],
    ])("rejects %s", async (_case, name) => {
      await expect(library.createPlaylist(A, name)).rejects.toBeInstanceOf(ValidationError);
    });

    it("accepts 60 characters, counting accents and emoji as one", async () => {
      await expect(library.createPlaylist(A, "á".repeat(59) + "🎵")).resolves.toBeDefined();
    });

    it("rejects a repeated name with other case, but not for another user", async () => {
      await library.createPlaylist(A, "Rock");
      const error = await library.createPlaylist(A, "rOCK").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as Error).message).toBe("Ya tienes una playlist con ese nombre.");
      await expect(library.createPlaylist(B, "rock")).resolves.toBeDefined();
    });

    it("lists playlists with the track count and up to 4 covers in added order (LIB-R7)", async () => {
      const rock = await library.createPlaylist(A, "Rock");
      for (const id of ids) {
        await library.addToPlaylist(A, rock.id, id);
        await tick();
      }
      await library.createPlaylist(A, "Vacía");

      const list = await library.listPlaylists(A);
      expect(list.map((p) => p.name)).toEqual(["Vacía", "Rock"]);
      expect(list[1]).toEqual({
        id: rock.id,
        name: "Rock",
        trackCount: 6,
        // Only odd tracks (indices 0, 2, 4) have a cover.
        coverTrackIds: [ids[0], ids[2], ids[4]],
      });
      expect(list[0]).toMatchObject({ trackCount: 0, coverTrackIds: [] });
    });

    it("shows the tracks in the order they were added (LIB-R8)", async () => {
      const { id } = await library.createPlaylist(A, "Rock");
      for (const trackId of [ids[3], ids[0], ids[5]]) {
        await library.addToPlaylist(A, id, trackId);
        await tick();
      }
      const detail = await library.getPlaylist(A, id);
      expect(detail.tracks.map((item) => item.track.id)).toEqual([ids[3], ids[0], ids[5]]);
      expect(detail.trackCount).toBe(3);
      expect(detail.tracks[0].addedAt).toBeInstanceOf(Date);
    });

    it("adding an unsaved track saves it too (LIB-R9)", async () => {
      const { id } = await library.createPlaylist(A, "Rock");
      await library.addToPlaylist(A, id, ids[2]);
      expect(await library.isSaved(A, ids[2])).toBe(true);
      expect(await playlistTrackIds(A, id)).toEqual([ids[2]]);
    });

    it("adding the same track twice has no effect", async () => {
      const { id } = await library.createPlaylist(A, "Rock");
      await library.addToPlaylist(A, id, ids[0]);
      await library.addToPlaylist(A, id, ids[0]);
      expect(await playlistTrackIds(A, id)).toEqual([ids[0]]);
    });

    it("adding a track that does not exist is not found and saves nothing", async () => {
      const { id } = await library.createPlaylist(A, "Rock");
      await expect(library.addToPlaylist(A, id, 999_999)).rejects.toBeInstanceOf(NotFoundError);
      expect(await savedIds(A)).toEqual([]);
    });

    it("removing from a playlist keeps the track saved (LIB-R10)", async () => {
      const { id } = await library.createPlaylist(A, "Rock");
      await library.addToPlaylist(A, id, ids[0]);
      await library.removeFromPlaylist(A, id, ids[0]);
      expect(await playlistTrackIds(A, id)).toEqual([]);
      expect(await library.isSaved(A, ids[0])).toBe(true);
    });

    it("deleting a playlist keeps its tracks saved (LIB-R11)", async () => {
      const { id } = await library.createPlaylist(A, "Rock");
      await library.addToPlaylist(A, id, ids[0]);
      await library.addToPlaylist(A, id, ids[1]);
      await library.deletePlaylist(A, id);
      await expect(library.getPlaylist(A, id)).rejects.toBeInstanceOf(NotFoundError);
      expect((await savedIds(A)).sort()).toEqual([ids[0], ids[1]].sort());
    });

    it("renames a playlist with the same rules as create (LIB-R12)", async () => {
      const rock = await library.createPlaylist(A, "Rock");
      await library.createPlaylist(A, "Pop");
      await library.renamePlaylist(A, rock.id, "Rock clásico");
      expect((await library.getPlaylist(A, rock.id)).name).toBe("Rock clásico");
      // Changing only the case of its own name is allowed.
      await library.renamePlaylist(A, rock.id, "ROCK CLÁSICO");
      await expect(library.renamePlaylist(A, rock.id, "pop")).rejects.toBeInstanceOf(
        ValidationError,
      );
      await expect(library.renamePlaylist(A, rock.id, "Guardadas")).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it("marks the playlists that already hold a track (LIB-R13)", async () => {
      const rock = await library.createPlaylist(A, "Rock");
      const gym = await library.createPlaylist(A, "Gym");
      await tick();
      // Adding a track makes Rock the most recently changed playlist.
      await library.addToPlaylist(A, rock.id, ids[0]);
      const list = await library.playlistsForTrack(A, ids[0]);
      expect(list).toEqual([
        { id: rock.id, name: "Rock", contains: true },
        { id: gym.id, name: "Gym", contains: false },
      ]);
    });

    it(`allows ${MAX_PLAYLISTS_PER_USER} playlists per user (LIB-R16)`, async () => {
      await db
        .insert(playlists)
        .values(
          Array.from({ length: MAX_PLAYLISTS_PER_USER }, (_, i) => ({ userId: A, name: `P${i}` })),
        );
      await expect(library.createPlaylist(A, "Una más")).rejects.toBeInstanceOf(LimitError);
      await expect(library.createPlaylist(B, "Una más")).resolves.toBeDefined();
    });

    it(`allows ${MAX_TRACKS_PER_PLAYLIST} tracks per playlist (LIB-R16)`, async () => {
      const { id } = await library.createPlaylist(A, "Grande");
      const extra = await db
        .insert(tracks)
        .values(
          Array.from({ length: MAX_TRACKS_PER_PLAYLIST }, (_, i) => ({
            sourcePath: `bulk-${i}.mp3`,
            contentSha256: `bulk-${i}`,
            title: `Bulk ${i}`,
            artist: "Artist",
            durationSec: 100,
            fingerprintVersion: 2,
            hashCount: 0,
          })),
        )
        .returning({ id: tracks.id });
      await db.insert(savedTracks).values(extra.map((t) => ({ userId: A, trackId: t.id })));
      await db
        .insert(playlistTracks)
        .values(extra.map((t) => ({ playlistId: id, userId: A, trackId: t.id })));

      await expect(library.addToPlaylist(A, id, ids[0])).rejects.toBeInstanceOf(LimitError);
      expect(await library.isSaved(A, ids[0])).toBe(false);
      // A track that is already there is still a no-op, not a limit error.
      await expect(library.addToPlaylist(A, id, extra[0].id)).resolves.toBeUndefined();
    });
  });

  describe("isolation between users (T4, LIB-R14)", () => {
    let rockOfA: string;

    beforeEach(async () => {
      rockOfA = (await library.createPlaylist(A, "Rock")).id;
      await library.addToPlaylist(A, rockOfA, ids[0]);
    });

    it.each([
      ["read", () => library.getPlaylist(B, rockOfA)],
      ["rename", () => library.renamePlaylist(B, rockOfA, "Mío")],
      ["delete", () => library.deletePlaylist(B, rockOfA)],
      ["add to", () => library.addToPlaylist(B, rockOfA, ids[1])],
      ["remove from", () => library.removeFromPlaylist(B, rockOfA, ids[0])],
    ])("B cannot %s A's playlist: not found", async (_action, run) => {
      await expect(run()).rejects.toBeInstanceOf(NotFoundError);
      // A's playlist is untouched.
      const detail = await library.getPlaylist(A, rockOfA);
      expect(detail.name).toBe("Rock");
      expect(detail.tracks.map((item) => item.track.id)).toEqual([ids[0]]);
      expect(await library.isSaved(B, ids[1])).toBe(false);
    });

    it("a missing playlist and a foreign one give the same error", async () => {
      const foreign = await library.getPlaylist(B, rockOfA).catch((e: unknown) => e);
      const missing = await library.getPlaylist(B, MISSING_UUID).catch((e: unknown) => e);
      expect(foreign).toEqual(missing);
    });

    it.each(["not-a-uuid", "", "'; DROP TABLE playlists; --"])(
      "a malformed playlist id %j is not found",
      async (badId) => {
        await expect(library.getPlaylist(A, badId)).rejects.toBeInstanceOf(NotFoundError);
        await expect(library.deletePlaylist(A, badId)).rejects.toBeInstanceOf(NotFoundError);
      },
    );

    it("B sees neither A's playlists nor A's saved tracks", async () => {
      expect(await library.listPlaylists(B)).toEqual([]);
      expect(await library.playlistsForTrack(B, ids[0])).toEqual([]);
      expect(await savedIds(B)).toEqual([]);
      expect(await library.recentSaved(B)).toEqual([]);
    });

    it("B unsaving the same track does not touch A's library", async () => {
      await library.saveTrack(B, ids[0]);
      await library.unsaveTrack(B, ids[0]);
      expect(await library.isSaved(A, ids[0])).toBe(true);
      expect(await playlistTrackIds(A, rockOfA)).toEqual([ids[0]]);
    });

    it("deleting a user removes their library and keeps the other one", async () => {
      await library.saveTrack(B, ids[1]);
      await db.delete(user).where(eq(user.id, A));
      expect(await library.listPlaylists(A)).toEqual([]);
      expect(await savedIds(B)).toEqual([ids[1]]);
    });
  });
});
