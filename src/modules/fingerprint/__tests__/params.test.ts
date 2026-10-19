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
      hopSize: 512,
      bandEdges: [1, 10, 20, 40, 80, 160, 512],
      peakAlpha: 1.0,
      silenceThreshold: 1.0,
      peakContinuityBins: 1,
      targetZone: { minDeltaFrames: 1, maxDeltaFrames: 64, maxDeltaBins: 128, fanOut: 5 },
    });
  });

  it("keeps band edges increasing and inside the 9-bit bin range", () => {
    const edges = DEFAULT_PARAMS.bandEdges;
    for (let i = 1; i < edges.length; i++) expect(edges[i]).toBeGreaterThan(edges[i - 1]);
    expect(edges.at(-1)).toBeLessThanOrEqual(DEFAULT_PARAMS.windowSize / 2);
    expect(edges.at(-1)).toBeLessThanOrEqual(512);
  });

  it("keeps the target zone inside the 14-bit delta field", () => {
    const zone = DEFAULT_PARAMS.targetZone;
    expect(zone.minDeltaFrames).toBeGreaterThanOrEqual(1);
    expect(zone.maxDeltaFrames).toBeLessThan(2 ** 14);
  });

  it("cannot be mutated at runtime", () => {
    expect(Object.isFrozen(DEFAULT_PARAMS)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PARAMS.bandEdges)).toBe(true);
    expect(Object.isFrozen(DEFAULT_PARAMS.targetZone)).toBe(true);
  });
});
