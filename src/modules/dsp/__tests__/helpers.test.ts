import { describe, expect, it } from "vitest";

import { constant, impulse, mulberry32, randomSignal, sineCycles, sineHz } from "./helpers";

describe("test signal helpers", () => {
  it("mulberry32 is deterministic and stays in [0, 1)", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("different seeds give different signals", () => {
    expect(randomSignal(64, 1)).not.toEqual(randomSignal(64, 2));
    expect(randomSignal(64, 7)).toEqual(randomSignal(64, 7));
  });

  it("random samples stay in [-1, 1)", () => {
    for (const value of randomSignal(4096, 3)) {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThan(1);
    }
  });

  it("builds impulses and constants", () => {
    expect(Array.from(impulse(4, 2))).toEqual([0, 0, 1, 0]);
    expect(Array.from(constant(3, 0.5))).toEqual([0.5, 0.5, 0.5]);
  });

  it("sineCycles completes exactly the requested periods", () => {
    const signal = sineCycles(8, 1);
    expect(signal[0]).toBe(0);
    expect(signal[2]).toBeCloseTo(1, 12);
    expect(signal[6]).toBeCloseTo(-1, 12);
  });

  it("sineHz returns Float32 samples at the given rate", () => {
    const signal = sineHz(1000, 11025, 100);
    expect(signal).toBeInstanceOf(Float32Array);
    expect(signal[0]).toBe(0);
    expect(signal[1]).toBeCloseTo(Math.sin((2 * Math.PI * 1000) / 11025), 6);
  });
});
