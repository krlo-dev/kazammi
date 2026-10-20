import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { fingerprints, trackCovers, tracks, type Database } from "@/modules/db";
import { createTestDb } from "@/modules/db/testing";

import { createCatalogRepository, type CatalogRepository, type NewTrack } from "../index";

const newTrack = (n: number): NewTrack => ({
  sourcePath: `artist/song-${n}.mp3`,
  contentSha256: `sha-${n}`,
  title: `Song ${n}`,
  artist: "Artist",
  album: n === 1 ? "Album" : null,
  genre: null,
  year: n === 1 ? 2020 : null,
  durationSec: 180.5,
});

/** hashes base, base+1, ..., at anchor frames 0, 1, ... */
const sequence = (base: number, length: number) => ({
  hashes: Uint32Array.from({ length }, (_, i) => base + i),
  anchorFrames: Uint32Array.from({ length }, (_, i) => i),
});

describe("catalog repository (PGlite)", () => {
  let db: Database;
  let close: () => Promise<void>;
  let catalog: CatalogRepository;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    catalog = createCatalogRepository(db);
  });
  afterEach(() => close());

  const insert = (
    n: number,
    fp: { hashes: Uint32Array; anchorFrames: Uint32Array },
    withCover = false,
  ) =>
    catalog.insertTrackWithFingerprints({
      track: newTrack(n),
      cover: withCover ? { mime: "image/webp", data: Uint8Array.from([1, 2, 3, n]) } : null,
      ...fp,
      fingerprintVersion: 1,
    });

  it("finds the right track with the expected delta and count, runner-up is another track", async () => {
    const a = await insert(1, sequence(1000, 200));
    // Track 2 shares 30 hashes with track 1, but at scattered offsets.
    const b = await insert(2, {
      hashes: Uint32Array.from({ length: 30 }, (_, i) => 1000 + i * 5),
      anchorFrames: Uint32Array.from({ length: 30 }, (_, i) => (i * 37) % 100),
    });
    await insert(3, sequence(5000, 200));

    // Query: 60 hashes of track 1 starting at frame 40, recorded from t = 0.
    const query = {
      hashes: Uint32Array.from({ length: 60 }, (_, i) => 1040 + i),
      times: Uint32Array.from({ length: 60 }, (_, i) => i),
    };
    const candidates = await catalog.findCandidates(query.hashes, query.times, 5);

    expect(candidates[0]).toEqual({ trackId: a, delta: 40, count: 60 });
    expect(candidates[1].trackId).toBe(b);
    expect(candidates[1].count).toBeLessThan(60);
    expect(new Set(candidates.map((c) => c.trackId)).size).toBe(candidates.length);
  });

  it("adds the votes of the neighbouring offsets, a query frame grid is not the indexed one", async () => {
    const a = await insert(1, sequence(1000, 200));
    const b = await insert(2, sequence(5000, 200));
    // Track 1: 20 hashes at delta 40 and 20 at delta 41. Track 2: 30 hashes at delta 10.
    const hashes = Uint32Array.from([
      ...Array.from({ length: 20 }, (_, i) => 1040 + i),
      ...Array.from({ length: 20 }, (_, i) => 1100 + i),
      ...Array.from({ length: 30 }, (_, i) => 5010 + i),
    ]);
    const times = Uint32Array.from([
      ...Array.from({ length: 20 }, (_, i) => i),
      ...Array.from({ length: 20 }, (_, i) => 59 + i),
      ...Array.from({ length: 30 }, (_, i) => i),
    ]);
    const candidates = await catalog.findCandidates(hashes, times, 5);

    // The tie between deltas 40 and 41 resolves to the lower one.
    expect(candidates).toEqual([
      { trackId: a, delta: 40, count: 40 },
      { trackId: b, delta: 10, count: 30 },
    ]);
  });

  it("returns the offset histogram of one track, top offsets sorted by delta", async () => {
    const a = await insert(1, sequence(1000, 200));
    await insert(2, sequence(1000, 200)); // same hashes, other track: must not count
    // 30 hashes aligned at delta 40, plus 5 scattered at delta 7.
    const hashes = Uint32Array.from([
      ...Array.from({ length: 30 }, (_, i) => 1040 + i),
      1100,
      1101,
      1102,
      1103,
      1104,
    ]);
    const times = Uint32Array.from([
      ...Array.from({ length: 30 }, (_, i) => i),
      93,
      94,
      95,
      96,
      97,
    ]);
    expect(await catalog.getOffsetHistogram(a, hashes, times, 10)).toEqual([
      [7, 5],
      [40, 30],
    ]);
    expect(await catalog.getOffsetHistogram(a, hashes, times, 1)).toEqual([[40, 30]]);
    expect(await catalog.getOffsetHistogram(a, new Uint32Array(0), new Uint32Array(0), 5)).toEqual(
      [],
    );
  });

  it("keeps uint32 hashes above 2^31 intact through bigint", async () => {
    const id = await insert(1, {
      hashes: Uint32Array.from([0xffffffff, 0x80000000, 0]),
      anchorFrames: Uint32Array.from([10, 11, 12]),
    });
    const candidates = await catalog.findCandidates(
      Uint32Array.from([0xffffffff, 0x80000000]),
      Uint32Array.from([0, 1]),
      3,
    );
    expect(candidates).toEqual([{ trackId: id, delta: 10, count: 2 }]);
  });

  it("returns no candidates for empty queries or unknown hashes", async () => {
    await insert(1, sequence(1000, 10));
    expect(await catalog.findCandidates(new Uint32Array(0), new Uint32Array(0), 5)).toEqual([]);
    expect(await catalog.findCandidates(Uint32Array.from([7]), Uint32Array.from([0]), 5)).toEqual(
      [],
    );
    expect(
      await catalog.findCandidates(Uint32Array.from([1000]), Uint32Array.from([0]), 0),
    ).toEqual([]);
    await expect(
      catalog.findCandidates(Uint32Array.from([1]), new Uint32Array(0), 5),
    ).rejects.toThrow(RangeError);
  });

  it("stores the track metadata, hash count and fingerprint version", async () => {
    const id = await insert(1, sequence(1000, 25), true);
    const [row] = await db.select().from(tracks).where(eq(tracks.id, id));
    expect(row).toMatchObject({
      ...newTrack(1),
      hasCover: true,
      fingerprintVersion: 1,
      hashCount: 25,
    });
    expect(await db.$count(fingerprints, eq(fingerprints.trackId, id))).toBe(25);
  });

  it("is idempotent by content hash and rolls back a failed insert", async () => {
    await insert(1, sequence(1000, 10));
    expect(await catalog.findTrackIdBySha256("sha-1")).toBe(1);
    expect(await catalog.findTrackIdBySha256("sha-2")).toBeNull();

    await expect(insert(1, sequence(9000, 10))).rejects.toThrow();
    expect(await db.$count(tracks)).toBe(1);
    expect(await db.$count(fingerprints)).toBe(10);
  });

  it("rejects mismatched hashes and anchor frames before touching the database", async () => {
    await expect(
      catalog.insertTrackWithFingerprints({
        track: newTrack(1),
        cover: null,
        hashes: Uint32Array.from([1, 2]),
        anchorFrames: Uint32Array.from([1]),
        fingerprintVersion: 1,
      }),
    ).rejects.toThrow(RangeError);
    expect(await db.$count(tracks)).toBe(0);
  });

  it("gets tracks by id in the requested order, skipping unknown ids", async () => {
    const a = await insert(1, sequence(1000, 5), true);
    const b = await insert(2, sequence(2000, 5));
    const found = await catalog.getTracksByIds([b, 999, a]);
    expect(found.map((t) => t.id)).toEqual([b, a]);
    expect(found[1]).toEqual({
      id: a,
      title: "Song 1",
      artist: "Artist",
      album: "Album",
      genre: null,
      year: 2020,
      durationSec: 180.5,
      hasCover: true,
    });
    expect(await catalog.getTracksByIds([])).toEqual([]);
  });

  it("stores and returns covers as Uint8Array", async () => {
    const a = await insert(1, sequence(1000, 5), true);
    const b = await insert(2, sequence(2000, 5));
    const cover = await catalog.getCover(a);
    expect(cover?.mime).toBe("image/webp");
    expect(cover?.data).toBeInstanceOf(Uint8Array);
    expect(Array.from(cover!.data)).toEqual([1, 2, 3, 1]);
    expect(await catalog.getCover(b)).toBeNull();
  });

  it("reports stats and the indexed fingerprint version", async () => {
    expect(await catalog.getStats()).toMatchObject({
      tracks: 0,
      fingerprints: 0,
      fingerprintVersion: null,
    });
    await insert(1, sequence(1000, 40));
    await insert(2, sequence(2000, 2));
    await catalog.setFingerprintVersion(1);
    await catalog.setFingerprintVersion(2);
    const stats = await catalog.getStats();
    expect(stats).toMatchObject({ tracks: 2, fingerprints: 42, fingerprintVersion: 2 });
    expect(stats.tableBytes).toBeGreaterThan(0);
  });

  it("regenerates the fingerprints of a track and keeps its row", async () => {
    const a = await insert(1, sequence(1000, 50), true);
    const b = await insert(2, sequence(2000, 5));
    await catalog.deleteAllFingerprints();
    expect(await db.$count(fingerprints)).toBe(0);
    expect(await db.$count(tracks)).toBe(2);

    await catalog.replaceFingerprints({ trackId: a, ...sequence(7000, 30), fingerprintVersion: 2 });
    const [row] = await db.select().from(tracks).where(eq(tracks.id, a));
    expect(row).toMatchObject({ fingerprintVersion: 2, hashCount: 30, hasCover: true });
    expect(await db.$count(fingerprints, eq(fingerprints.trackId, a))).toBe(30);
    expect(await db.$count(fingerprints, eq(fingerprints.trackId, b))).toBe(0);

    // Replacing again does not duplicate rows.
    await catalog.replaceFingerprints({ trackId: a, ...sequence(7000, 10), fingerprintVersion: 2 });
    expect(await db.$count(fingerprints, eq(fingerprints.trackId, a))).toBe(10);
    const candidates = await catalog.findCandidates(
      Uint32Array.from([7000, 7001]),
      Uint32Array.from([0, 1]),
      5,
    );
    expect(candidates).toEqual([{ trackId: a, delta: 0, count: 2 }]);
  });

  it("vacuums the fingerprints table", async () => {
    await insert(1, sequence(1000, 100));
    await expect(catalog.vacuumFingerprints()).resolves.toBeUndefined();
  });

  it("deletes fingerprints and cover in cascade when a track is deleted", async () => {
    const a = await insert(1, sequence(1000, 50), true);
    const b = await insert(2, sequence(2000, 5), true);
    await db.delete(tracks).where(eq(tracks.id, a));
    expect(await db.$count(fingerprints, eq(fingerprints.trackId, a))).toBe(0);
    expect(await db.$count(trackCovers, eq(trackCovers.trackId, a))).toBe(0);
    expect(await db.$count(fingerprints, eq(fingerprints.trackId, b))).toBe(5);
    expect(await db.$count(trackCovers)).toBe(1);
  });

  it("uses the covering hash index for lookups", async () => {
    await insert(1, sequence(1000, 2000));
    await db.execute(sql`ANALYZE fingerprints`);
    await db.execute(sql`SET enable_seqscan = off`);
    const plan = await db.execute(
      sql`EXPLAIN SELECT track_id, anchor_frame FROM fingerprints WHERE hash = 1500`,
    );
    const text = JSON.stringify(plan);
    expect(text).toMatch(/fingerprints_hash_idx/);
  });
});
