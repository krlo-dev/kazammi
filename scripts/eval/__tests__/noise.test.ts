import { describe, expect, it } from "vitest";

import { addNoise, gaussian, mulberry32, power, snrDb } from "../noise";

const SAMPLE_RATE = 11025;
const sine = (seconds: number) =>
  Float32Array.from({ length: seconds * SAMPLE_RATE }, (_, n) =>
    Math.sin((2 * Math.PI * 440 * n) / SAMPLE_RATE),
  );

describe("gaussian", () => {
  it("has mean 0 and variance 1", () => {
    const normal = gaussian(mulberry32(1));
    const samples = Float64Array.from({ length: 200_000 }, normal);
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
    expect(Math.abs(mean)).toBeLessThan(0.01);
    expect(Math.abs(variance - 1)).toBeLessThan(0.01);
  });

  it("is reproducible with the same seed", () => {
    const a = gaussian(mulberry32(7));
    const b = gaussian(mulberry32(7));
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
});

describe("addNoise", () => {
  it.each([20, 10, 5, 0, -5])("reaches the requested SNR of %s dB within 0.1 dB", (target) => {
    const clean = sine(10);
    const noisy = addNoise(clean, target, mulberry32(target + 100));
    expect(Math.abs(snrDb(clean, noisy) - target)).toBeLessThan(0.1);
  });

  it("returns an untouched copy for infinite SNR", () => {
    const clean = sine(1);
    const copy = addNoise(clean, Infinity, mulberry32(1));
    expect(copy).toEqual(clean);
    expect(copy).not.toBe(clean);
  });

  it("does not modify the input", () => {
    const clean = sine(1);
    const before = clean.slice();
    addNoise(clean, 0, mulberry32(2));
    expect(clean).toEqual(before);
  });

  it("measures power", () => {
    expect(power([1, -1, 1, -1])).toBe(1);
    expect(power(sine(2))).toBeCloseTo(0.5, 3);
    expect(power([])).toBe(0);
  });
});
