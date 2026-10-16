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
