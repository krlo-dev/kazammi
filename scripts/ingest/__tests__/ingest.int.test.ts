import path from "node:path";

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCatalogRepository, type CatalogRepository } from "@/modules/catalog";
import { appMeta, fingerprints, trackCovers, tracks, type Database } from "@/modules/db";
import { createTestDb } from "@/modules/db/testing";
import { FINGERPRINT_VERSION } from "@/modules/fingerprint";

import { runIngest, VersionMismatchError, type IngestDeps, type IngestOptions } from "../ingest";
import { MetadataError, parseFilename, type TrackMetadata } from "../metadata";
import { BYTES_PER_FINGERPRINT, formatSummary } from "../report";
import { tempDir, writeFiles } from "./fixtures";

const SAMPLE_RATE = 11025;

/** Deterministic synthetic "song": 3 sines whose frequencies change every 0.5 s. */
function melody(seconds: number, seed: number): Float32Array {
  const out = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  const segment = SAMPLE_RATE / 2;
  for (let n = 0; n < out.length; n++) {
    const k = Math.floor(n / segment) + seed * 31;
    let value = 0;
    for (let j = 1; j <= 3; j++) {
      const f = 200 + ((k * 7919 * j) % 3800);
      value += Math.sin((2 * Math.PI * f * n) / SAMPLE_RATE);
    }
    out[n] = value / 3;
  }
  return out;
}

/**
 * The file contents drive the fake dependencies: "melody:<seconds>:<seed>" decodes to a
 * synthetic song, "broken" fails to decode. Names follow 'Artista - Título.ext'.
 */
function fakeDeps(catalog: CatalogRepository | null, overrides: Partial<IngestDeps> = {}) {
  const contents = new Map<string, string>();
  const log: string[] = [];
  const deps: IngestDeps = {
    catalog,
    decode: async (file) => {
      const content = contents.get(path.basename(file)) ?? "";
      if (content === "broken") throw new Error("ffmpeg exited with code 1: invalid data");
      const [, seconds, seed] = content.split(":");
      return melody(Number(seconds), Number(seed));
    },
    readMetadata: async (file): Promise<TrackMetadata> => {
      const name = parseFilename(file);
      if (!name) throw new MetadataError("no title/artist");
      const picture = contents.get(path.basename(file))?.endsWith(":cover")
        ? Uint8Array.from([9, 9, 9])
        : null;
      return { ...name, album: "Album", genre: "Pop", year: 2001, picture };
    },
    normalizeCover: async (picture) => Uint8Array.from([...picture, 1]),
    log: (line) => log.push(line),
    ...overrides,
  };
  return { deps, contents, log };
}

describe("runIngest (PGlite)", () => {
  let db: Database;
  let closeDb: () => Promise<void>;
  let catalog: CatalogRepository;
  let dir: string;
  let cleanup: () => Promise<void>;

  const options = (extra: Partial<IngestOptions> = {}): IngestOptions => ({
    dir,
    concurrency: 3,
    dryRun: false,
    reset: false,
    ...extra,
  });

  async function songs(files: Record<string, string>, contents: Map<string, string>) {
    await writeFiles(dir, files);
    for (const [name, content] of Object.entries(files)) contents.set(path.basename(name), content);
  }

  beforeEach(async () => {
    ({ db, close: closeDb } = await createTestDb());
    catalog = createCatalogRepository(db);
    ({ dir, cleanup } = await tempDir());
  });
  afterEach(async () => {
    await closeDb();
    await cleanup();
  });

  it("indexes every song with metadata, cover and fingerprints, then is idempotent", async () => {
    const { deps, contents } = fakeDeps(catalog);
    await songs(
      {
        "Artist A - Song One.mp3": "melody:12:1:cover",
        "Artist B - Song Two.flac": "melody:15:2",
        "sub/Artist C - Song Three.ogg": "melody:11:3:cover",
      },
      contents,
    );

    const first = await runIngest(options(), deps);
    expect(first).toMatchObject({ files: 3, inserted: 3, skipped: 0, errors: [], dryRun: false });
    expect(first.averageHashes).toBeGreaterThan(0);
    expect(first.tableBytes).toBeGreaterThan(0);

    const rows = await db.select().from(tracks).orderBy(tracks.sourcePath);
    expect(rows.map((r) => r.sourcePath)).toEqual([
      "Artist A - Song One.mp3",
      "Artist B - Song Two.flac",
      "sub/Artist C - Song Three.ogg",
    ]);
    expect(rows[0]).toMatchObject({
      title: "Song One",
      artist: "Artist A",
      album: "Album",
      genre: "Pop",
      year: 2001,
      hasCover: true,
      fingerprintVersion: FINGERPRINT_VERSION,
    });
    expect(rows[0].durationSec).toBeCloseTo(12, 3);
    expect(rows[0].contentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[1].hasCover).toBe(false);
    for (const row of rows) {
      expect(await db.$count(fingerprints, eq(fingerprints.trackId, row.id))).toBe(row.hashCount);
    }
    const [cover] = await db.select().from(trackCovers).where(eq(trackCovers.trackId, rows[0].id));
    expect(cover.mime).toBe("image/webp");
    expect(Array.from(cover.data)).toEqual([9, 9, 9, 1]);
    expect(await db.select().from(appMeta)).toEqual([
      { key: "fingerprint_version", value: String(FINGERPRINT_VERSION) },
    ]);

    const second = await runIngest(options(), deps);
    expect(second).toMatchObject({ inserted: 0, skipped: 3, errors: [] });
    expect(await db.$count(tracks)).toBe(3);
    expect(await db.$count(fingerprints)).toBe(rows.reduce((sum, r) => sum + r.hashCount, 0));
  });

  it("reports undecodable, too short and untitled files and keeps going", async () => {
    const { deps, contents } = fakeDeps(catalog);
    await songs(
      {
        "Good - Song.mp3": "melody:12:1",
        "Bad - Broken.mp3": "broken",
        "Tiny - Clip.mp3": "melody:9.5:2",
        "untitled.mp3": "melody:12:3",
      },
      contents,
    );
    const summary = await runIngest(options(), deps);
    expect(summary.inserted).toBe(1);
    expect(summary.errors).toEqual(
      expect.arrayContaining([
        { label: "Bad - Broken", reason: "ffmpeg exited with code 1: invalid data" },
        { label: "Tiny - Clip", reason: "dura 9.5 s (< 10 s)" },
        { label: "untitled.mp3", reason: "no title/artist" },
      ]),
    );
    expect(summary.errors).toHaveLength(3);
    expect(formatSummary(summary)).toMatch(/Con error:\s+3/);
    expect(await db.$count(tracks)).toBe(1);
  });

  it("indexes a song without cover when the cover cannot be converted", async () => {
    const { deps, contents, log } = fakeDeps(catalog, {
      normalizeCover: () => Promise.reject(new Error("unsupported image format")),
    });
    await songs({ "Artist - Song.mp3": "melody:12:1:cover" }, contents);
    expect((await runIngest(options(), deps)).inserted).toBe(1);
    expect((await db.select().from(tracks))[0].hasCover).toBe(false);
    expect(log.some((line) => line.includes("portada ilegible"))).toBe(true);
  });

  it("respects --limit", async () => {
    const { deps, contents } = fakeDeps(catalog);
    await songs(
      { "A - 1.mp3": "melody:12:1", "B - 2.mp3": "melody:12:2", "C - 3.mp3": "melody:12:3" },
      contents,
    );
    expect(await runIngest(options({ limit: 2 }), deps)).toMatchObject({ files: 2, inserted: 2 });
  });

  it("dry run estimates the size without touching the database", async () => {
    const getStats = vi.spyOn(catalog, "getStats");
    const { deps, contents } = fakeDeps(catalog);
    await songs({ "A - 1.mp3": "melody:12:1:cover", "B - 2.mp3": "melody:20:2" }, contents);
    const summary = await runIngest(options({ dryRun: true }), deps);
    expect(summary).toMatchObject({ dryRun: true, inserted: 0, tableBytes: null, errors: [] });
    expect(summary.estimatedBytes).toBe(summary.averageHashes * 2 * BYTES_PER_FINGERPRINT + 4);
    expect(getStats).not.toHaveBeenCalled();
    expect(await db.$count(tracks)).toBe(0);
    expect(formatSummary(summary)).toMatch(/dry run/);
  });

  it("stops when the database was indexed with another fingerprint version", async () => {
    const { deps, contents } = fakeDeps(catalog);
    await songs({ "A - 1.mp3": "melody:12:1" }, contents);
    await catalog.setFingerprintVersion(FINGERPRINT_VERSION + 1);
    await expect(runIngest(options(), deps)).rejects.toThrow(VersionMismatchError);
    expect(await db.$count(tracks)).toBe(0);
  });

  it("--reset regenerates fingerprints, keeps track ids and reports missing files", async () => {
    const { deps, contents } = fakeDeps(catalog);
    await songs({ "A - 1.mp3": "melody:12:1:cover", "B - 2.mp3": "melody:14:2" }, contents);
    await runIngest(options(), deps);
    const before = await db.select().from(tracks).orderBy(tracks.id);
    const total = await db.$count(fingerprints);

    // Simulate an old index plus a song whose file is no longer in the folder.
    await catalog.setFingerprintVersion(FINGERPRINT_VERSION + 1);
    await catalog.insertTrackWithFingerprints({
      track: {
        sourcePath: "gone.mp3",
        contentSha256: "gone",
        title: "Gone",
        artist: "X",
        album: null,
        genre: null,
        year: null,
        durationSec: 30,
      },
      cover: null,
      hashes: Uint32Array.from([1, 2]),
      anchorFrames: Uint32Array.from([0, 1]),
      fingerprintVersion: FINGERPRINT_VERSION + 1,
    });

    const summary = await runIngest(options({ reset: true }), deps);
    expect(summary).toMatchObject({ inserted: 0, regenerated: 2, staleTracks: 1, errors: [] });
    expect(formatSummary(summary)).toMatch(/1 canciones quedaron sin fingerprints/);

    const after = await db.select().from(tracks).orderBy(tracks.id);
    expect(after.slice(0, 2).map((t) => t.id)).toEqual(before.map((t) => t.id));
    expect(after[0].hasCover).toBe(true);
    expect(await db.$count(trackCovers)).toBe(1);
    expect(await db.$count(fingerprints)).toBe(total);
    expect(await catalog.getStats()).toMatchObject({ fingerprintVersion: FINGERPRINT_VERSION });
  });
});
