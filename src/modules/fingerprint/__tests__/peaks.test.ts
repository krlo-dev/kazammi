import { describe, expect, it } from "vitest";

import { stft, type Spectrogram } from "@/modules/dsp";

import { normalize } from "../normalize";
import { DEFAULT_PARAMS } from "../params";
import { findPeaks } from "../peaks";
import { binSines, SAMPLE_RATE, whiteNoise } from "./signals";

const spectrogramOf = (signal: Float32Array): Spectrogram =>
  stft(signal, SAMPLE_RATE, { windowSize: 1024, hopSize: 512 });

describe("findPeaks", () => {
  it("finds no peaks in silence", () => {
    const spec = spectrogramOf(new Float32Array(SAMPLE_RATE * 2));
    expect(spec.frames).toBeGreaterThan(0);
    expect(findPeaks(spec, DEFAULT_PARAMS)).toEqual([]);
  });

  it("finds one peak per sine at the expected bins, in every frame", () => {
    const bins = [5, 30, 100, 300]; // bands [1,10), [20,40), [80,160), [160,512)
    const spec = spectrogramOf(binSines(SAMPLE_RATE * 2, bins, 0.25));
    const peaks = findPeaks(spec, DEFAULT_PARAMS);
    expect(peaks).toHaveLength(spec.frames * bins.length);
    for (let frame = 0; frame < spec.frames; frame++) {
      const inFrame = peaks.filter((p) => p.frame === frame).map((p) => p.bin);
      expect(inFrame).toEqual(bins);
    }
  });

  it("finds fewer than 6 peaks per frame in white noise", () => {
    const spec = spectrogramOf(normalize(whiteNoise(SAMPLE_RATE * 5, 11)));
    const peaks = findPeaks(spec, DEFAULT_PARAMS);
    const perFrame = new Uint32Array(spec.frames);
    for (const p of peaks) perFrame[p.frame]++;
    expect(peaks.length).toBeGreaterThan(0);
    for (const count of perFrame) expect(count).toBeLessThan(6);
  });

  it("ignores quiet content below the silence threshold", () => {
    const spec = spectrogramOf(binSines(SAMPLE_RATE, [50], 1e-4));
    expect(findPeaks(spec, DEFAULT_PARAMS)).toEqual([]);
  });

  it("returns peaks sorted by (frame, bin) with their magnitudes", () => {
    const spec = spectrogramOf(normalize(whiteNoise(SAMPLE_RATE * 2, 4)));
    const peaks = findPeaks(spec, DEFAULT_PARAMS);
    for (let i = 1; i < peaks.length; i++) {
      const a = peaks[i - 1];
      const b = peaks[i];
      expect(a.frame < b.frame || (a.frame === b.frame && a.bin < b.bin)).toBe(true);
    }
    for (const p of peaks) {
      expect(p.magnitude).toBe(spec.data[p.frame * spec.bins + p.bin]);
      expect(p.bin).toBeGreaterThanOrEqual(1);
      expect(p.bin).toBeLessThan(512);
    }
  });
});
