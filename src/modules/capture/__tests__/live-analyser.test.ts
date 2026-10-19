import { describe, expect, it } from "vitest";

import { createLiveAnalyser, LIVE_BANDS, LIVE_FFT_SIZE } from "../live-analyser";

const sine = (hz: number, sampleRate: number, amplitude = 1) =>
  Float32Array.from(
    { length: LIVE_FFT_SIZE },
    (_, n) => amplitude * Math.sin((2 * Math.PI * hz * n) / sampleRate),
  );

const loudestBand = (spectrum: Float32Array) => spectrum.indexOf(Math.max(...spectrum));

/** Band index that holds `hz` with the same log scale as the analyser (60 Hz to 8 kHz). */
const bandOf = (hz: number) => Math.floor((LIVE_BANDS * Math.log(hz / 60)) / Math.log(8000 / 60));

describe("createLiveAnalyser", () => {
  it.each([44100, 48000])("places a 1 kHz sine in its band at %i Hz", (sampleRate) => {
    const { spectrum } = createLiveAnalyser(sampleRate).analyse(sine(1000, sampleRate));
    expect(spectrum).toHaveLength(LIVE_BANDS);
    expect(Math.abs(loudestBand(spectrum) - bandOf(1000))).toBeLessThanOrEqual(1);
    expect(Math.max(...spectrum)).toBeGreaterThan(0.95);
  });

  it("moves the peak up with the frequency", () => {
    const analyser = createLiveAnalyser(48000);
    const low = loudestBand(analyser.analyse(sine(300, 48000)).spectrum);
    const high = loudestBand(analyser.analyse(sine(4000, 48000)).spectrum);
    expect(high).toBeGreaterThan(low);
  });

  it("reports the RMS level: about 0.707 for a full-scale sine, 0 for silence", () => {
    const analyser = createLiveAnalyser(48000);
    expect(analyser.analyse(sine(1000, 48000)).level).toBeCloseTo(Math.SQRT1_2, 2);
    const silent = analyser.analyse(new Float32Array(LIVE_FFT_SIZE));
    expect(silent.level).toBe(0);
    expect(Math.max(...silent.spectrum)).toBe(0);
  });

  it("keeps every band in [0, 1], even for a clipped square wave", () => {
    const square = sine(500, 48000).map((x) => (x >= 0 ? 1 : -1));
    const { spectrum, level } = createLiveAnalyser(48000).analyse(square);
    expect(Math.min(...spectrum)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...spectrum)).toBeLessThanOrEqual(1);
    expect(level).toBeLessThanOrEqual(1);
  });

  it("rejects a window of the wrong size", () => {
    expect(() => createLiveAnalyser(48000).analyse(new Float32Array(512))).toThrow(RangeError);
  });
});
