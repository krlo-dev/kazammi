import { describe, expect, it } from "vitest";

import { DEFAULT_PARAMS, FINGERPRINT_VERSION } from "../params";

describe("fingerprint params", () => {
  it("exposes a positive integer version", () => {
    expect(Number.isInteger(FINGERPRINT_VERSION)).toBe(true);
    expect(FINGERPRINT_VERSION).toBeGreaterThanOrEqual(1);
  });

  it("matches the values documented in design.md and math-model.md", () => {
    expect(DEFAULT_PARAMS).toEqual({
      sampleRate: 11025,
      windowSize: 1024,
      hopSize: 256,
      neighborhood: { bins: 6, frames: 10 },
      minBin: 23,
      maxBin: 372,
      peakFloorDb: -70,
      maxPeaksPerSecond: 30,
      targetZone: { minDeltaFrames: 1, maxDeltaFrames: 128, maxDeltaBins: 128, fanOut: 10 },
    });
  });

  it("keeps the peak bins ordered and inside the 9-bit bin range", () => {
    expect(DEFAULT_PARAMS.minBin).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_PARAMS.maxBin).toBeGreaterThan(DEFAULT_PARAMS.minBin);
    expect(DEFAULT_PARAMS.maxBin).toBeLessThanOrEqual(DEFAULT_PARAMS.windowSize / 2);
    expect(DEFAULT_PARAMS.maxBin).toBeLessThanOrEqual(512);
  });

  it("keeps the target zone inside the 14-bit delta field", () => {
    const zone = DEFAULT_PARAMS.targetZone;
    expect(zone.minDeltaFrames).toBeGreaterThanOrEqual(1);
    expect(zone.maxDeltaFrames).toBeLessThan(2 ** 14);
  });

  it("cannot be mutated at runtime", () => {
    expect(Object.isFrozen(DEFAULT_PARAMS)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PARAMS.neighborhood)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PARAMS.targetZone)).toBe(true);
  });
});
