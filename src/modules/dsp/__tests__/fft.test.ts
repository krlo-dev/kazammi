import { describe, expect, it } from "vitest";

import { dft } from "../dft";
import { createFftPlan } from "../fft";
import { constant, impulse, randomSignal, sineCycles } from "./helpers";

const TOLERANCE = 1e-9;

const SIZES = Array.from({ length: 12 }, (_, i) => 2 ** (i + 1)); // 2 .. 4096

function forward(re: Float64Array, im: Float64Array = new Float64Array(re.length)) {
  const outRe = re.slice();
  const outIm = im.slice();
  createFftPlan(re.length).forward(outRe, outIm);
  return { re: outRe, im: outIm };
}

describe("createFftPlan().forward", () => {
  it.each(SIZES)("matches the reference DFT for random complex input, N = %i", (size) => {
    const re = randomSignal(size, size);
    const im = randomSignal(size, size + 1);
    const expected = dft(re, im);
    const actual = forward(re, im);
    let maxError = 0;
    for (let k = 0; k < size; k++) {
      maxError = Math.max(
        maxError,
        Math.abs(actual.re[k] - expected.re[k]),
        Math.abs(actual.im[k] - expected.im[k]),
      );
    }
    expect(maxError).toBeLessThan(TOLERANCE);
  });

  it("transforms a unit impulse into a flat spectrum of magnitude 1", () => {
    const { re, im } = forward(impulse(256));
    for (let k = 0; k < 256; k++) {
      expect(Math.abs(Math.hypot(re[k], im[k]) - 1)).toBeLessThan(TOLERANCE);
    }
  });

  it("transforms a constant c into X[0] = N*c and zeros elsewhere", () => {
    const size = 512;
    const value = -0.3;
    const { re, im } = forward(constant(size, value));
    expect(Math.abs(re[0] - size * value)).toBeLessThan(TOLERANCE);
    for (let k = 1; k < size; k++) {
      expect(Math.hypot(re[k], im[k])).toBeLessThan(TOLERANCE);
    }
  });

  it("puts a sine with k cycles at bins k and N-k with magnitude N/2", () => {
    const size = 1024;
    const cycles = 37;
    const { re, im } = forward(sineCycles(size, cycles));
    for (let k = 0; k < size; k++) {
      const expected = k === cycles || k === size - cycles ? size / 2 : 0;
      expect(Math.abs(Math.hypot(re[k], im[k]) - expected)).toBeLessThan(TOLERANCE);
    }
  });

  it("satisfies Parseval: sum |x|^2 = (1/N) sum |X|^2", () => {
    const size = 4096;
    const signal = randomSignal(size, 99);
    const { re, im } = forward(signal);
    let timeEnergy = 0;
    let freqEnergy = 0;
    for (let i = 0; i < size; i++) {
      timeEnergy += signal[i] ** 2;
      freqEnergy += re[i] ** 2 + im[i] ** 2;
    }
    freqEnergy /= size;
    expect(Math.abs(timeEnergy - freqEnergy) / timeEnergy).toBeLessThan(1e-12);
  });

  it("reuses the same plan across calls with identical results", () => {
    const plan = createFftPlan(64);
    const signal = randomSignal(64, 5);
    const first = { re: signal.slice(), im: new Float64Array(64) };
    const second = { re: signal.slice(), im: new Float64Array(64) };
    plan.forward(first.re, first.im);
    plan.forward(second.re, second.im);
    expect(second.re).toEqual(first.re);
    expect(second.im).toEqual(first.im);
    expect(plan.size).toBe(64);
  });

  it.each([1000, 0, 1, 3, -8, 2.5, Number.NaN])("rejects invalid size %s with RangeError", (n) => {
    expect(() => createFftPlan(n)).toThrow(RangeError);
  });

  it("explains the problem in the error message", () => {
    expect(() => createFftPlan(1000)).toThrow(/power of 2.*1000/);
  });

  it("rejects buffers whose length does not match the plan", () => {
    const plan = createFftPlan(8);
    expect(() => plan.forward(new Float64Array(4), new Float64Array(4))).toThrow(RangeError);
    expect(() => plan.forward(new Float64Array(8), new Float64Array(4))).toThrow(RangeError);
  });
});

describe("createFftPlan().inverse", () => {
  it.each(SIZES)("recovers x from IFFT(FFT(x)) with error < 1e-12, N = %i", (size) => {
    const originalRe = randomSignal(size, 3 * size);
    const originalIm = randomSignal(size, 3 * size + 1);
    const re = originalRe.slice();
    const im = originalIm.slice();
    const plan = createFftPlan(size);
    plan.forward(re, im);
    plan.inverse(re, im);
    for (let i = 0; i < size; i++) {
      expect(Math.abs(re[i] - originalRe[i])).toBeLessThan(1e-12);
      expect(Math.abs(im[i] - originalIm[i])).toBeLessThan(1e-12);
    }
  });

  it("turns a flat spectrum back into a unit impulse", () => {
    const re = constant(16, 1);
    const im = new Float64Array(16);
    createFftPlan(16).inverse(re, im);
    expect(Math.abs(re[0] - 1)).toBeLessThan(TOLERANCE);
    for (let i = 1; i < 16; i++) expect(Math.hypot(re[i], im[i])).toBeLessThan(TOLERANCE);
  });

  it("rejects mismatched buffers without touching them", () => {
    const im = Float64Array.from([1, 2, 3, 4]);
    expect(() => createFftPlan(8).inverse(new Float64Array(8), im)).toThrow(RangeError);
    expect(Array.from(im)).toEqual([1, 2, 3, 4]);
  });
});
