import { describe, expect, it } from "vitest";

import { dft } from "../dft";
import { constant, impulse, sineCycles } from "./helpers";

const TOLERANCE = 1e-9;

describe("dft", () => {
  it("transforms a unit impulse into a flat spectrum of magnitude 1", () => {
    const size = 16;
    const { re, im } = dft(impulse(size), new Float64Array(size));
    for (let k = 0; k < size; k++) {
      expect(Math.abs(re[k] - 1)).toBeLessThan(TOLERANCE);
      expect(Math.abs(im[k])).toBeLessThan(TOLERANCE);
    }
  });

  it("transforms a constant c into X[0] = N*c and zeros elsewhere", () => {
    const size = 32;
    const value = 0.75;
    const { re, im } = dft(constant(size, value), new Float64Array(size));
    expect(Math.abs(re[0] - size * value)).toBeLessThan(TOLERANCE);
    expect(Math.abs(im[0])).toBeLessThan(TOLERANCE);
    for (let k = 1; k < size; k++) {
      expect(Math.abs(re[k])).toBeLessThan(TOLERANCE);
      expect(Math.abs(im[k])).toBeLessThan(TOLERANCE);
    }
  });

  it("puts a sine with k cycles at bins k and N-k with magnitude N/2", () => {
    const size = 64;
    const cycles = 5;
    const { re, im } = dft(sineCycles(size, cycles), new Float64Array(size));
    for (let k = 0; k < size; k++) {
      const magnitude = Math.hypot(re[k], im[k]);
      const expected = k === cycles || k === size - cycles ? size / 2 : 0;
      expect(Math.abs(magnitude - expected)).toBeLessThan(TOLERANCE);
    }
  });

  it("uses the e^{-j...} sign convention (impulse at n=1 rotates clockwise)", () => {
    const size = 4;
    const { re, im } = dft(impulse(size, 1), new Float64Array(size));
    // X[1] = e^{-j pi/2} = -j
    expect(Math.abs(re[1])).toBeLessThan(TOLERANCE);
    expect(Math.abs(im[1] + 1)).toBeLessThan(TOLERANCE);
  });

  it("does not mutate its inputs and works for non powers of 2", () => {
    const re = Float64Array.from([1, 2, 3]);
    const im = Float64Array.from([0, 0, 0]);
    const out = dft(re, im);
    expect(Array.from(re)).toEqual([1, 2, 3]);
    expect(Array.from(im)).toEqual([0, 0, 0]);
    expect(Math.abs(out.re[0] - 6)).toBeLessThan(TOLERANCE);
  });

  it("rejects mismatched re/im lengths", () => {
    expect(() => dft(new Float64Array(4), new Float64Array(3))).toThrow(RangeError);
  });
});
