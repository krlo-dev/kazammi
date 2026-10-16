import { describe, expect, it } from "vitest";

import { buildHashes, decodeHash, encodeHash } from "../hash";
import { DEFAULT_PARAMS, type FingerprintParams } from "../params";
import type { Peak } from "../peaks";

const peak = (frame: number, bin: number): Peak => ({ frame, bin, magnitude: 1 });

describe("encodeHash / decodeHash", () => {
  it.each([
    [0, 0, 0],
    [511, 511, 16383],
    [511, 0, 0],
    [0, 511, 0],
    [0, 0, 16383],
    [1, 1, 1],
    [256, 255, 8192],
  ])("round-trips (%i, %i, %i)", (anchorBin, pointBin, deltaFrames) => {
    const hash = encodeHash(anchorBin, pointBin, deltaFrames);
    expect(decodeHash(hash)).toEqual({ anchorBin, pointBin, deltaFrames });
  });

  it("always returns an unsigned 32-bit integer", () => {
    const max = encodeHash(511, 511, 16383);
    expect(max).toBe(0xffffffff);
    expect(encodeHash(256, 0, 0)).toBe(2 ** 31);
    for (const hash of [max, encodeHash(256, 0, 0), encodeHash(300, 7, 12)]) {
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(hash)).toBe(true);
    }
  });

  it("follows the documented bit layout", () => {
    expect(encodeHash(1, 0, 0)).toBe(1 << 23);
    expect(encodeHash(0, 1, 0)).toBe(1 << 14);
    expect(encodeHash(0, 0, 1)).toBe(1);
  });

  it.each([
    [512, 0, 0],
    [0, 512, 0],
    [0, 0, 16384],
    [-1, 0, 0],
    [1.5, 0, 0],
  ])("rejects out of range fields (%s, %s, %s)", (a, p, d) => {
    expect(() => encodeHash(a, p, d)).toThrow(RangeError);
  });
});

describe("buildHashes", () => {
  it("pairs each anchor with up to fanOut later peaks", () => {
    const peaks = Array.from({ length: 20 }, (_, i) => peak(i, 50));
    const { hashes, anchorFrames } = buildHashes(peaks, DEFAULT_PARAMS);
    // Anchors 0..14 get 5 pairs, then 4, 3, 2, 1, 0.
    expect(hashes).toHaveLength(15 * 5 + 4 + 3 + 2 + 1);
    expect(anchorFrames).toHaveLength(hashes.length);
    const perAnchor = new Map<number, number>();
    for (const frame of anchorFrames) perAnchor.set(frame, (perAnchor.get(frame) ?? 0) + 1);
    for (const count of perAnchor.values()) expect(count).toBeLessThanOrEqual(5);
    // The first anchor takes the 5 nearest peaks in time.
    expect(Array.from(hashes.slice(0, 5), (h) => decodeHash(h).deltaFrames)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("skips peaks in the same frame and outside the frequency band of the zone", () => {
    const peaks = [peak(0, 100), peak(0, 120), peak(1, 300), peak(2, 228), peak(3, 229)];
    const { hashes, anchorFrames } = buildHashes(peaks, DEFAULT_PARAMS);
    const pairs = Array.from(hashes, (h, i) => ({ ...decodeHash(h), anchor: anchorFrames[i] }));
    expect(pairs).toContainEqual({ anchorBin: 100, pointBin: 228, deltaFrames: 2, anchor: 0 });
    // Same frame (dt = 0) and |dbin| = 200 > 128 are rejected; 229 - 100 = 129 > 128 too.
    expect(pairs.filter((p) => p.anchor === 0 && p.anchorBin === 100)).toHaveLength(1);
    for (const p of pairs) {
      expect(p.deltaFrames).toBeGreaterThanOrEqual(1);
      expect(p.deltaFrames).toBeLessThanOrEqual(64);
      expect(Math.abs(p.pointBin - p.anchorBin)).toBeLessThanOrEqual(128);
    }
  });

  it("stops looking once a peak is farther than maxDeltaFrames", () => {
    const peaks = [peak(0, 10), peak(64, 10), peak(65, 10)];
    const pairs = Array.from(buildHashes(peaks, DEFAULT_PARAMS).hashes, decodeHash);
    expect(pairs).toEqual([
      { anchorBin: 10, pointBin: 10, deltaFrames: 64 },
      { anchorBin: 10, pointBin: 10, deltaFrames: 1 },
    ]);
  });

  it("respects a custom target zone", () => {
    const params: FingerprintParams = {
      ...DEFAULT_PARAMS,
      targetZone: { minDeltaFrames: 2, maxDeltaFrames: 3, maxDeltaBins: 5, fanOut: 1 },
    };
    const peaks = [peak(0, 10), peak(1, 10), peak(2, 20), peak(2, 14), peak(3, 15)];
    const pairs = Array.from(buildHashes(peaks, params).hashes, decodeHash);
    expect(pairs[0]).toEqual({ anchorBin: 10, pointBin: 14, deltaFrames: 2 });
    expect(pairs).toHaveLength(2); // (0,10)->(2,14) and (1,10)->(3,15)
  });

  it("returns empty arrays for no peaks", () => {
    const { hashes, anchorFrames } = buildHashes([], DEFAULT_PARAMS);
    expect(hashes).toHaveLength(0);
    expect(anchorFrames).toHaveLength(0);
  });
});
