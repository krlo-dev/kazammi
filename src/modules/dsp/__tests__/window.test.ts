import { describe, expect, it } from "vitest";

import { hann } from "../window";

describe("hann", () => {
  it.each([5, 31, 1025])("is 0 at both ends and 1 at the center for odd N = %i", (size) => {
    const window = hann(size);
    expect(window).toHaveLength(size);
    expect(window[0]).toBe(0);
    expect(Math.abs(window[size - 1])).toBeLessThan(1e-15);
    expect(window[(size - 1) / 2]).toBeCloseTo(1, 15);
    expect(Math.max(...window)).toBeCloseTo(1, 15);
  });

  it("is symmetric and stays in [0, 1]", () => {
    const window = hann(1024);
    for (let n = 0; n < 1024; n++) {
      expect(window[n]).toBeGreaterThanOrEqual(0);
      expect(window[n]).toBeLessThanOrEqual(1);
      expect(Math.abs(window[n] - window[1023 - n])).toBeLessThan(1e-15);
    }
  });

  it("returns [1] for a single sample", () => {
    expect(Array.from(hann(1))).toEqual([1]);
  });

  it.each([0, -4, 2.5])("rejects invalid size %s", (size) => {
    expect(() => hann(size)).toThrow(RangeError);
  });
});
