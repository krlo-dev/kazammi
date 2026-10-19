import { describe, expect, it } from "vitest";

import { stft, type Spectrogram } from "@/modules/dsp";

import { normalize } from "../normalize";
import { DEFAULT_PARAMS } from "../params";
import { findPeaks } from "../peaks";
import { binSines, SAMPLE_RATE, whiteNoise } from "./signals";

const spectrogramOf = (signal: Float32Array): Spectrogram =>
  stft(signal, SAMPLE_RATE, { windowSize: 1024, hopSize: 512 });

/** Hand-written spectrogram, row-major: values[frame * bins + bin]. */
const tinySpectrogram = (values: number[], bins: number): Spectrogram => ({
  frames: values.length / bins,
  bins,
  sampleRate: SAMPLE_RATE,
  windowSize: 1024,
  hopSize: 512,
  data: new Float32Array(values),
});

describe("findPeaks", () => {
  it("finds no peaks in silence", () => {
    const spec = spectrogramOf(new Float32Array(SAMPLE_RATE * 2));
    expect(spec.frames).toBeGreaterThan(0);
    expect(findPeaks(spec, DEFAULT_PARAMS)).toEqual([]);
  });

  it("finds one peak per sine at the expected bins, in the first frame", () => {
    const bins = [5, 30, 100, 300]; // bands [1,10), [20,40), [80,160), [160,512)
    const spec = spectrogramOf(binSines(SAMPLE_RATE * 2, bins, 0.25));
    expect(findPeaks(spec, DEFAULT_PARAMS).map((p) => [p.frame, p.bin])).toEqual(
      bins.map((bin) => [0, bin]),
    );
  });

  it("keeps a single peak, its onset, for a sine sustained for 5 s", () => {
    const spec = spectrogramOf(binSines(SAMPLE_RATE * 5, [100], 0.5));
    expect(spec.frames).toBeGreaterThan(100);
    expect(findPeaks(spec, DEFAULT_PARAMS).map((p) => [p.frame, p.bin])).toEqual([[0, 100]]);
  });

  it("adds a new peak when the frequency jumps more than B bins within the band", () => {
    const jumpFrame = 50;
    const half = jumpFrame * DEFAULT_PARAMS.hopSize;
    const signal = new Float32Array(2 * half);
    signal.set(binSines(half, [100], 0.5));
    signal.set(binSines(half, [110], 0.5), half); // same band [80, 160)
    const peaks = findPeaks(spectrogramOf(signal), DEFAULT_PARAMS);
    expect(peaks).toHaveLength(2);
    expect([peaks[0].frame, peaks[0].bin]).toEqual([0, 100]);
    expect(peaks[1].bin).toBe(110);
    // The frame before the jump already straddles both halves of the signal.
    expect(peaks[1].frame).toBeGreaterThanOrEqual(jumpFrame - 1);
    expect(peaks[1].frame).toBeLessThanOrEqual(jumpFrame);
  });

  it("drops a peak that continues within ±B bins and keeps one farther away", () => {
    // 4 frames x 6 bins, a single band [1, 6): bins 2, 3 (continues), 5 (jump), 5 (continues).
    const params = { ...DEFAULT_PARAMS, bandEdges: [1, 6], peakContinuityBins: 1 };
    const spec = tinySpectrogram(
      [0, 0, 9, 0, 0, 0, /**/ 0, 0, 0, 9, 0, 0, /**/ 0, 0, 0, 0, 0, 9, /**/ 0, 0, 0, 0, 0, 9],
      6,
    );
    expect(findPeaks(spec, params)).toEqual([
      { frame: 0, bin: 2, magnitude: 9 },
      { frame: 2, bin: 5, magnitude: 9 },
    ]);
  });

  it("treats a note after a silent frame as a new onset", () => {
    const params = { ...DEFAULT_PARAMS, bandEdges: [1, 2] };
    const spec = tinySpectrogram([0, 7, 0, 7, 0, 0, 0, 7], 2);
    expect(findPeaks(spec, params).map((p) => p.frame)).toEqual([0, 3]);
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
