import { describe, expect, it } from "vitest";

import { binToHz, frameToSeconds, stft, toDecibels } from "../stft";
import { sineHz } from "./helpers";

const SAMPLE_RATE = 11025;

describe("stft", () => {
  it("places a 1 kHz sine at bin round(1000 * 1024 / 11025) = 93 in every frame", () => {
    const signal = sineHz(1000, SAMPLE_RATE, SAMPLE_RATE * 2);
    const spec = stft(signal, SAMPLE_RATE, { windowSize: 1024, hopSize: 512 });
    expect(spec.bins).toBe(513);
    expect(spec.frames).toBeGreaterThan(0);
    for (let frame = 0; frame < spec.frames; frame++) {
      const row = frame * spec.bins;
      let peak = 0;
      for (let k = 1; k < spec.bins; k++) {
        if (spec.data[row + k] > spec.data[row + peak]) peak = k;
      }
      expect(peak).toBe(93);
    }
  });

  it.each([
    [1024, 1024, 512, 1],
    [1535, 1024, 512, 1],
    [1536, 1024, 512, 2],
    [110250, 1024, 512, 214],
    [5000, 256, 100, 48],
  ])("a signal of %i samples with N = %i, H = %i gives %i frames", (length, n, h, frames) => {
    expect(frames).toBe(Math.floor((length - n) / h) + 1);
    const spec = stft(new Float32Array(length), SAMPLE_RATE, { windowSize: n, hopSize: h });
    expect(spec.frames).toBe(frames);
    expect(spec.data).toHaveLength(frames * (n / 2 + 1));
  });

  it("returns 0 frames when the signal is shorter than the window", () => {
    const spec = stft(new Float32Array(1000), SAMPLE_RATE, { windowSize: 1024, hopSize: 512 });
    expect(spec.frames).toBe(0);
    expect(spec.data).toHaveLength(0);
  });

  it("stores its parameters and Float32 magnitudes", () => {
    const spec = stft(new Float32Array(2048), SAMPLE_RATE, { windowSize: 512, hopSize: 256 });
    expect(spec).toMatchObject({ sampleRate: SAMPLE_RATE, windowSize: 512, hopSize: 256 });
    expect(spec.data).toBeInstanceOf(Float32Array);
  });

  it("does not modify the input signal", () => {
    const signal = sineHz(440, SAMPLE_RATE, 4096);
    const copy = signal.slice();
    stft(signal, SAMPLE_RATE, { windowSize: 1024, hopSize: 512 });
    expect(signal).toEqual(copy);
  });

  it("rejects invalid parameters", () => {
    const signal = new Float32Array(4096);
    expect(() => stft(signal, SAMPLE_RATE, { windowSize: 1000, hopSize: 512 })).toThrow(RangeError);
    expect(() => stft(signal, SAMPLE_RATE, { windowSize: 1024, hopSize: 0 })).toThrow(RangeError);
    expect(() => stft(signal, 0, { windowSize: 1024, hopSize: 512 })).toThrow(RangeError);
  });
});

describe("conversions", () => {
  it("converts magnitudes to decibels", () => {
    expect(toDecibels(1)).toBe(0);
    expect(toDecibels(10)).toBeCloseTo(20, 12);
    expect(toDecibels(0.1)).toBeCloseTo(-20, 12);
    expect(toDecibels(0)).toBeCloseTo(-200, 12);
    expect(toDecibels(0, 1e-5)).toBeCloseTo(-100, 12);
  });

  it("converts bins to Hz", () => {
    expect(binToHz(0, SAMPLE_RATE, 1024)).toBe(0);
    expect(binToHz(512, SAMPLE_RATE, 1024)).toBe(SAMPLE_RATE / 2);
    expect(binToHz(93, SAMPLE_RATE, 1024)).toBeCloseTo(1001.29, 2);
  });

  it("converts frames to seconds", () => {
    expect(frameToSeconds(0, SAMPLE_RATE, 512)).toBe(0);
    expect(frameToSeconds(1, SAMPLE_RATE, 512)).toBeCloseTo(512 / SAMPLE_RATE, 15);
    expect(frameToSeconds(SAMPLE_RATE, SAMPLE_RATE, 512)).toBe(512);
  });
});
