import { describe, expect, it } from "vitest";

import { power } from "../noise";
import { applyRoom } from "../room";

const SAMPLE_RATE = 11025;
const sine = (hz: number, seconds = 2) =>
  Float32Array.from(
    { length: SAMPLE_RATE * seconds },
    (_, n) => 0.5 * Math.sin((2 * Math.PI * hz * n) / SAMPLE_RATE),
  );

/** Power ratio out/in, in dB, without noise. */
const gainDb = (hz: number) => {
  const input = sine(hz);
  const output = applyRoom(input, { sampleRate: SAMPLE_RATE, snrDb: Infinity, seed: 1 });
  // Skip the first half second: the filters and the reverb tail settle.
  const settle = SAMPLE_RATE / 2;
  return 10 * Math.log10(power(output.subarray(settle)) / power(input.subarray(settle)));
};

describe("applyRoom", () => {
  it("is deterministic for a seed and keeps the length", () => {
    const input = sine(1000);
    const a = applyRoom(input, { sampleRate: SAMPLE_RATE, snrDb: 10, seed: 7 });
    const b = applyRoom(input, { sampleRate: SAMPLE_RATE, snrDb: 10, seed: 7 });
    expect(a).toHaveLength(input.length);
    expect(a).toEqual(b);
  });

  it("cuts the bass and the treble a phone speaker cannot play", () => {
    const mid = gainDb(1000);
    expect(gainDb(80) - mid).toBeLessThan(-12);
    expect(gainDb(5000) - mid).toBeLessThan(-3);
  });

  it("adds noise at the requested SNR over the processed signal", () => {
    const input = sine(1000, 4);
    const clean = applyRoom(input, { sampleRate: SAMPLE_RATE, snrDb: Infinity, seed: 3 });
    const noisy = applyRoom(input, { sampleRate: SAMPLE_RATE, snrDb: 10, seed: 3 });
    const noise = noisy.map((v, i) => v - clean[i]);
    expect(10 * Math.log10(power(clean) / power(noise))).toBeCloseTo(10, 5);
  });
});
