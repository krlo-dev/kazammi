import type { FingerprintParams } from "./params";
import type { Peak } from "./peaks";

// Layout of the 32-bit hash: | anchorBin (9) | pointBin (9) | deltaFrames (14) |
const BIN_BITS = 9;
const DELTA_BITS = 14;
const MAX_BIN = (1 << BIN_BITS) - 1; // 511
const MAX_DELTA = (1 << DELTA_BITS) - 1; // 16383
const ANCHOR_SHIFT = BIN_BITS + DELTA_BITS; // 23
const POINT_SHIFT = DELTA_BITS; // 14

function assertField(name: string, value: number, max: number): void {
  if (!Number.isInteger(value) || value < 0 || value > max) {
    throw new RangeError(`${name} must be an integer in [0, ${max}], got ${value}`);
  }
}

/** Packs a peak pair into an unsigned 32-bit integer. */
export function encodeHash(anchorBin: number, pointBin: number, deltaFrames: number): number {
  assertField("anchorBin", anchorBin, MAX_BIN);
  assertField("pointBin", pointBin, MAX_BIN);
  assertField("deltaFrames", deltaFrames, MAX_DELTA);
  // Bitwise operators work on signed int32; >>> 0 turns the result back into uint32.
  return ((anchorBin << ANCHOR_SHIFT) | (pointBin << POINT_SHIFT) | deltaFrames) >>> 0;
}

export function decodeHash(hash: number): {
  anchorBin: number;
  pointBin: number;
  deltaFrames: number;
} {
  return {
    anchorBin: (hash >>> ANCHOR_SHIFT) & MAX_BIN,
    pointBin: (hash >>> POINT_SHIFT) & MAX_BIN,
    deltaFrames: hash & MAX_DELTA,
  };
}

/**
 * Pairs every anchor peak with up to fanOut later peaks inside its target zone.
 * `peaks` must be sorted by (frame, bin), as findPeaks returns them.
 */
export function buildHashes(
  peaks: readonly Peak[],
  params: FingerprintParams,
): { hashes: Uint32Array; anchorFrames: Uint32Array } {
  const { minDeltaFrames, maxDeltaFrames, maxDeltaBins, fanOut } = params.targetZone;
  const hashes = new Uint32Array(peaks.length * fanOut);
  const anchorFrames = new Uint32Array(peaks.length * fanOut);
  let count = 0;

  for (let i = 0; i < peaks.length; i++) {
    const anchor = peaks[i];
    let pairs = 0;
    for (let j = i + 1; j < peaks.length && pairs < fanOut; j++) {
      const point = peaks[j];
      const deltaFrames = point.frame - anchor.frame;
      if (deltaFrames > maxDeltaFrames) break;
      if (deltaFrames < minDeltaFrames) continue;
      if (Math.abs(point.bin - anchor.bin) > maxDeltaBins) continue;
      hashes[count] = encodeHash(anchor.bin, point.bin, deltaFrames);
      anchorFrames[count] = anchor.frame;
      count++;
      pairs++;
    }
  }

  return { hashes: hashes.slice(0, count), anchorFrames: anchorFrames.slice(0, count) };
}
