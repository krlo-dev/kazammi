import { describe, expect, it } from "vitest";

import { stft, type Spectrogram } from "@/modules/dsp";

import { normalize } from "../normalize";
import { DEFAULT_PARAMS } from "../params";
import { findPeaks } from "../peaks";
import { binSines, SAMPLE_RATE, whiteNoise } from "./signals";

const spectrogramOf = (signal: Float32Array): Spectrogram =>
  stft(signal, SAMPLE_RATE, { windowSize: 1024, hopSize: DEFAULT_PARAMS.hopSize });

/** Hand-written spectrogram, row-major: values[frame * bins + bin]. */
const tinySpectrogram = (values: number[], bins: number): Spectrogram => ({
  frames: values.length / bins,
  bins,
  sampleRate: SAMPLE_RATE,
  windowSize: 1024,
  hopSize: DEFAULT_PARAMS.hopSize,
  data: new Float32Array(values),
});

describe("findPeaks", () => {
  it("finds no peaks in silence", () => {
    const spec = spectrogramOf(new Float32Array(SAMPLE_RATE * 2));
    expect(spec.frames).toBeGreaterThan(0);
    expect(findPeaks(spec, DEFAULT_PARAMS)).toEqual([]);
  });

  it("finds sines inside [minBin, maxBin) at their bins and ignores those outside", () => {
    const bins = [10, 50, 150, 300, 450]; // 10 and 450 fall outside [23, 372)
    const spec = spectrogramOf(binSines(SAMPLE_RATE * 2, bins, 0.2));
    const found = new Set(findPeaks(spec, DEFAULT_PARAMS).map((p) => p.bin));
    expect([...found].sort((a, b) => a - b)).toEqual([50, 150, 300]);
  });

  it("keeps a single peak, at its first frame, for a sine sustained for 5 s", () => {
    const spec = spectrogramOf(binSines(SAMPLE_RATE * 5, [100], 0.5));
    expect(spec.frames).toBeGreaterThan(100);
    expect(findPeaks(spec, DEFAULT_PARAMS).map((p) => [p.frame, p.bin])).toEqual([[0, 100]]);
  });

  it("keeps only the local maximum of its time-frequency neighborhood", () => {
    // 3 frames x 6 bins, peaks searched in [1, 6) with a ±1 x ±1 neighborhood.
    const params = {
      ...DEFAULT_PARAMS,
      neighborhood: { bins: 1, frames: 1 },
      minBin: 1,
      maxBin: 6,
    };
    const spec = tinySpectrogram(
      [0, 5, 0, 0, 2, 0, /**/ 0, 3, 0, 0, 0, 4, /**/ 0, 0, 0, 1, 0, 0],
      6,
    );
    expect(findPeaks(spec, params)).toEqual([
      { frame: 0, bin: 1, magnitude: 5 },
      { frame: 1, bin: 5, magnitude: 4 },
      { frame: 2, bin: 3, magnitude: 1 },
    ]);
  });

  it("keeps the first bin of a plateau and drops the ones that tie with it", () => {
    const params = {
      ...DEFAULT_PARAMS,
      neighborhood: { bins: 1, frames: 1 },
      minBin: 1,
      maxBin: 4,
    };
    // Bins 1 and 2 tie in frame 0, bin 2 repeats in frame 1 within the 1e-3 tolerance.
    const spec = tinySpectrogram([0, 6, 6, 0, /**/ 0, 0, 6.001, 0], 4);
    expect(findPeaks(spec, params)).toEqual([{ frame: 0, bin: 1, magnitude: 6 }]);
  });

  it("drops peaks below peakFloorDb relative to the loudest bin", () => {
    const params = {
      ...DEFAULT_PARAMS,
      neighborhood: { bins: 1, frames: 1 },
      minBin: 1,
      maxBin: 6,
    };
    // 100 is the loudest; 0.005 is -86 dB below it, 0.5 is -46 dB.
    const spec = tinySpectrogram([0, 100, 0, 0.005, 0, 0.5], 6);
    expect(findPeaks(spec, params).map((p) => p.bin)).toEqual([1, 5]);
  });

  it("caps the density: at most maxPeaksPerSecond louder peaks within ±0.5 s", () => {
    const spec = spectrogramOf(normalize(whiteNoise(SAMPLE_RATE * 5, 11)));
    const peaks = findPeaks(spec, DEFAULT_PARAMS);
    const half = Math.round(SAMPLE_RATE / DEFAULT_PARAMS.hopSize / 2);
    expect(peaks.length).toBeGreaterThan(0);
    for (const p of peaks) {
      const louder = peaks.filter(
        (q) => Math.abs(q.frame - p.frame) <= half && q.magnitude > p.magnitude,
      ).length;
      expect(louder).toBeLessThan(DEFAULT_PARAMS.maxPeaksPerSecond);
    }
    // The cap is what binds in white noise: fewer peaks than without it.
    const uncapped = findPeaks(spec, { ...DEFAULT_PARAMS, maxPeaksPerSecond: 1e9 });
    expect(peaks.length).toBeLessThan(uncapped.length);
  });

  it("finds the same peaks, shifted, when the signal is delayed by whole frames", () => {
    const signal = normalize(whiteNoise(SAMPLE_RATE * 4, 3));
    const d = 13;
    const delayed = new Float32Array(signal.length + d * DEFAULT_PARAMS.hopSize);
    delayed.set(signal, d * DEFAULT_PARAMS.hopSize);
    const key = (p: { frame: number; bin: number }) => `${p.frame},${p.bin}`;
    const original = findPeaks(spectrogramOf(signal), DEFAULT_PARAMS);
    const shifted = findPeaks(spectrogramOf(delayed), DEFAULT_PARAMS);
    expect(shifted.map((p) => key({ frame: p.frame - d, bin: p.bin }))).toEqual(original.map(key));
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
      expect(p.bin).toBeGreaterThanOrEqual(DEFAULT_PARAMS.minBin);
      expect(p.bin).toBeLessThan(DEFAULT_PARAMS.maxBin);
    }
  });
});
