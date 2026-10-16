import { describe, expect, it } from "vitest";

import { normalize } from "../normalize";

describe("normalize", () => {
  it("scales the largest absolute sample to 1", () => {
    const out = normalize(Float32Array.from([0.1, -0.4, 0.2]));
    expect(out[1]).toBe(-1);
    expect(out[0]).toBeCloseTo(0.25, 6);
    expect(out[2]).toBeCloseTo(0.5, 6);
  });

  it("gives the same result regardless of the input volume", () => {
    const signal = Float32Array.from([0.3, -0.9, 0.6, 0.05]);
    const quiet = signal.map((x) => x * 0.1);
    const a = normalize(signal);
    const b = normalize(quiet);
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i], 6);
  });

  it("returns zeros for silence and does not mutate the input", () => {
    const silence = new Float32Array(8);
    expect(Array.from(normalize(silence))).toEqual(Array(8).fill(0));
    const input = Float32Array.from([2, -1]);
    normalize(input);
    expect(Array.from(input)).toEqual([2, -1]);
  });

  it("handles empty input", () => {
    expect(normalize(new Float32Array(0))).toHaveLength(0);
  });
});
