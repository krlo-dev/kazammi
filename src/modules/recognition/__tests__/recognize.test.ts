import { describe, expect, it, vi } from "vitest";

import type { CatalogRepository, Candidate, Track } from "@/modules/catalog";
import { recognizeRequestSchema } from "@/shared";

import { createRecognizer, VersionMismatchError } from "../recognize";

const TRACK: Track = {
  id: 42,
  title: "One More Time",
  artist: "Daft Punk",
  album: "Discovery",
  genre: "House",
  year: 2001,
  durationSec: 320.4,
  hasCover: true,
};

function fakeCatalog(options: {
  version?: number | null;
  candidates?: Candidate[];
  tracks?: Track[];
  histogram?: [number, number][];
}) {
  const catalog = {
    getStats: vi.fn(async () => ({
      tracks: 1,
      fingerprints: 10,
      fingerprintVersion: options.version === undefined ? 1 : options.version,
      tableBytes: 1,
    })),
    findCandidates: vi.fn<CatalogRepository["findCandidates"]>(
      async () => options.candidates ?? [],
    ),
    getTracksByIds: vi.fn(async () => options.tracks ?? [TRACK]),
    getOffsetHistogram: vi.fn<CatalogRepository["getOffsetHistogram"]>(
      async () => options.histogram ?? [[268, 156]],
    ),
  };
  return catalog as typeof catalog & CatalogRepository;
}

const request = (extra: Record<string, unknown> = {}) =>
  recognizeRequestSchema.parse({
    fingerprintVersion: 1,
    hashes: [
      [3221225472, 0],
      [3238002692, 1],
    ],
    ...extra,
  });

describe("recognize", () => {
  it("returns the matching track with cover url, offset in seconds and confidence", async () => {
    const catalog = fakeCatalog({
      candidates: [
        { trackId: 42, delta: 268, count: 156 },
        { trackId: 7, delta: 3, count: 9 },
      ],
    });
    const result = await createRecognizer({ catalog })(request());

    expect(result).toMatchObject({
      status: "match",
      track: {
        id: 42,
        title: "One More Time",
        artist: "Daft Punk",
        album: "Discovery",
        genre: "House",
        year: 2001,
        durationSec: 320.4,
        coverUrl: "/api/tracks/42/cover",
      },
      score: 156,
      runnerUpScore: 9,
    });
    if (result.status !== "match") throw new Error("expected a match");
    expect(result.track).not.toHaveProperty("hasCover");
    expect(result.offsetSeconds).toBeCloseTo((268 * 512) / 11025, 10);
    expect(result.confidence).toBeCloseTo(1 - 9 / 156, 10);
    expect(result.timings.totalMs).toBeGreaterThanOrEqual(result.timings.dbMs);
    expect(result).not.toHaveProperty("debug");

    const [hashes, times, limit] = catalog.findCandidates.mock.calls[0];
    expect(Array.from(hashes)).toEqual([3221225472, 3238002692]);
    expect(Array.from(times)).toEqual([0, 1]);
    expect(limit).toBe(10);
    expect(catalog.getOffsetHistogram).not.toHaveBeenCalled();
  });

  it("returns a null cover url when the track has no cover", async () => {
    const catalog = fakeCatalog({
      candidates: [{ trackId: 42, delta: 0, count: 50 }],
      tracks: [{ ...TRACK, hasCover: false }],
    });
    const result = await createRecognizer({ catalog })(request());
    expect(result.status === "match" && result.track.coverUrl).toBeNull();
  });

  it("adds the offset histogram of the winner in debug mode", async () => {
    const catalog = fakeCatalog({
      candidates: [{ trackId: 42, delta: 268, count: 156 }],
      histogram: [
        [268, 156],
        [269, 12],
      ],
    });
    const result = await createRecognizer({ catalog })(request({ debug: true }));
    expect(result.status === "match" && result.debug).toEqual({
      histogram: [
        [268, 156],
        [269, 12],
      ],
    });
    expect(catalog.getOffsetHistogram.mock.calls[0]?.[0]).toBe(42);
  });

  it("answers no_match with the best score when nothing is convincing", async () => {
    const catalog = fakeCatalog({
      candidates: [
        { trackId: 42, delta: 1, count: 12 },
        { trackId: 7, delta: 9, count: 10 },
      ],
    });
    const result = await createRecognizer({ catalog })(request());
    expect(result).toMatchObject({ status: "no_match", score: 12 });
    expect(catalog.getTracksByIds).not.toHaveBeenCalled();
  });

  it("answers no_match when the winning track disappeared", async () => {
    const catalog = fakeCatalog({ candidates: [{ trackId: 42, delta: 1, count: 80 }], tracks: [] });
    expect((await createRecognizer({ catalog })(request())).status).toBe("no_match");
  });

  it("rejects a request made with another fingerprint version", async () => {
    const catalog = fakeCatalog({ version: 2 });
    const error = await createRecognizer({ catalog })(request()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(VersionMismatchError);
    expect(error).toMatchObject({ requested: 1, indexed: 2 });
    expect(catalog.findCandidates).not.toHaveBeenCalled();
  });

  it("rejects requests while the catalog has never been indexed", async () => {
    const catalog = fakeCatalog({ version: null });
    await expect(createRecognizer({ catalog })(request())).rejects.toThrow("not been indexed");
  });

  it("caches the indexed version for a minute", async () => {
    let clock = 0;
    const catalog = fakeCatalog({ candidates: [] });
    const recognize = createRecognizer({ catalog, now: () => clock });
    await recognize(request());
    clock = 59_000;
    await recognize(request());
    expect(catalog.getStats).toHaveBeenCalledTimes(1);
    clock = 61_000;
    await recognize(request());
    expect(catalog.getStats).toHaveBeenCalledTimes(2);
  });

  it("uses custom match params", async () => {
    const catalog = fakeCatalog({ candidates: [{ trackId: 42, delta: 0, count: 12 }] });
    const strict = createRecognizer({ catalog });
    const lenient = createRecognizer({ catalog, params: { minScore: 10, minRatio: 2 } });
    expect((await strict(request())).status).toBe("no_match");
    expect((await lenient(request())).status).toBe("match");
  });
});

describe("recognizeRequestSchema", () => {
  const pair = [1, 0];
  it.each<[Record<string, unknown>, string]>([
    [{ hashes: [] }, "0 hashes"],
    [{ hashes: Array.from({ length: 20_001 }, () => pair) }, "more than 20,000 hashes"],
    [{ hashes: [[-1, 0]] }, "negative hash"],
    [{ hashes: [[2 ** 32, 0]] }, "hash above uint32"],
    [{ hashes: [[1.5, 0]] }, "non-integer hash"],
    [{ hashes: [[1, -1]] }, "negative time"],
    [{ hashes: [[1]] }, "missing time"],
    [{ fingerprintVersion: 0 }, "version 0"],
    [{ fingerprintVersion: "1" }, "version as string"],
  ])("rejects %o (%s)", (override) => {
    expect(
      recognizeRequestSchema.safeParse({ fingerprintVersion: 1, hashes: [pair], ...override })
        .success,
    ).toBe(false);
  });

  it("accepts the limits and defaults debug to false", () => {
    const parsed = recognizeRequestSchema.parse({
      fingerprintVersion: 1,
      hashes: [[0xffffffff, 0], ...Array.from({ length: 19_999 }, () => pair)],
    });
    expect(parsed.debug).toBe(false);
    expect(parsed.hashes).toHaveLength(20_000);
  });
});
