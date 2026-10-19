import { describe, expect, it } from "vitest";

import type { Spectrogram } from "@/modules/dsp";
import { DEFAULT_PARAMS, encodeHash } from "@/modules/fingerprint";
import type { RecognizeResponse } from "@/shared";

import type { AttemptResult } from "../attempts";
import { downsampleMinMax, pickHashExample, toRecognizerDebug, WAVEFORM_POINTS } from "../debug";

describe("downsampleMinMax", () => {
  it("reduces long PCM to WAVEFORM_POINTS values, (min, max) per block", () => {
    const pcm = Float32Array.from({ length: 11025 * 12 }, (_, i) => Math.sin(i / 10));
    const out = downsampleMinMax(pcm);
    expect(out).toHaveLength(WAVEFORM_POINTS);
    for (let b = 0; b < out.length; b += 2) expect(out[b]).toBeLessThanOrEqual(out[b + 1]);
  });

  it("keeps the extremes of each block", () => {
    const pcm = Float32Array.of(0, 1, -1, 0.5, 0.2, -0.3);
    expect(Array.from(downsampleMinMax(pcm, 4))).toEqual(
      Array.from(Float32Array.of(-1, 1, -0.3, 0.5)),
    );
  });

  it("uses one block per sample when the PCM is shorter than the points", () => {
    expect(Array.from(downsampleMinMax(Float32Array.of(0.5, -0.5), 10))).toEqual([
      0.5, 0.5, -0.5, -0.5,
    ]);
    expect(downsampleMinMax(new Float32Array(0))).toHaveLength(0);
  });
});

describe("toRecognizerDebug", () => {
  const spectrogram = { frames: 1 } as Spectrogram;
  const peaks = [{ frame: 0, bin: 3, magnitude: 2 }];
  const timings = { dbMs: 1, totalMs: 2 };
  const attempt = (response: RecognizeResponse, withDebug = true): AttemptResult => ({
    response,
    pcm: new Float32Array(100),
    debug: withDebug ? { spectrogram, peaks } : undefined,
  });

  it("is null when the attempt ran without debug", () => {
    expect(toRecognizerDebug(attempt({ status: "no_match", score: 0, timings }, false))).toBeNull();
  });

  it("has no histogram on a no_match", () => {
    expect(toRecognizerDebug(attempt({ status: "no_match", score: 0, timings }))).toEqual({
      waveform: expect.any(Float32Array),
      spectrogram,
      peaks,
      histogram: undefined,
      hashExample: null,
    });
  });

  it("carries the histogram of a match", () => {
    const histogram: [number, number][] = [
      [10, 40],
      [11, 3],
    ];
    const debug = toRecognizerDebug(
      attempt({
        status: "match",
        track: {
          id: 1,
          title: "t",
          artist: "a",
          album: null,
          genre: null,
          year: null,
          durationSec: 1,
          coverUrl: null,
        },
        saved: false,
        confidence: 1,
        offsetSeconds: 0,
        score: 40,
        runnerUpScore: 3,
        timings,
        debug: { histogram },
      }),
    );
    expect(debug?.histogram).toBe(histogram);
  });
});

describe("pickHashExample", () => {
  const peak = (frame: number, bin: number, magnitude = 1) => ({ frame, bin, magnitude });

  it("pairs the loudest anchor that has a full fan-out, like buildHashes", () => {
    const peaks = [
      peak(0, 50, 9), // loudest, but only 2 points in its zone
      peak(1, 60),
      peak(2, 70),
      peak(200, 100, 5),
      peak(201, 110),
      peak(202, 120),
      peak(203, 400), // outside the ±128 bins of the anchor
      peak(204, 130),
      peak(205, 140),
      peak(206, 150),
      peak(207, 160),
    ];
    // Fan-out of 5 for a small fixture; the default comes from the fingerprint params.
    const params = {
      ...DEFAULT_PARAMS,
      targetZone: { ...DEFAULT_PARAMS.targetZone, fanOut: 5 },
    };
    const example = pickHashExample(peaks, params);
    expect(example?.anchor).toEqual(peak(200, 100, 5));
    expect(example?.zone).toEqual({ fromFrame: 201, toFrame: 264, fromBin: 0, toBin: 228 });
    expect(example?.pairs.map((p) => p.point.bin)).toEqual([110, 120, 130, 140, 150]);
    expect(example?.pairs[0]).toMatchObject({ deltaFrames: 1, hash: encodeHash(100, 110, 1) });
  });

  it("is null when no anchor reaches the fan-out", () => {
    expect(pickHashExample([peak(0, 1), peak(1, 2)])).toBeNull();
  });
});
