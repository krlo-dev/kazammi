import { describe, expect, it, vi } from "vitest";

import type { RecognizeRequest, RecognizeResponse } from "@/shared";

import { dueAttempt, runAttempt, type AttemptDeps } from "../attempts";

describe("dueAttempt", () => {
  it("starts each attempt at 4, 8 and 12 s", () => {
    expect(dueAttempt(3999, 0, false)).toBeNull();
    expect(dueAttempt(4000, 0, false)).toBe(0);
    expect(dueAttempt(7999, 1, false)).toBeNull();
    expect(dueAttempt(8000, 1, false)).toBe(1);
    expect(dueAttempt(12000, 2, false)).toBe(2);
  });

  it("waits while an attempt is processing, then starts the late one", () => {
    expect(dueAttempt(9000, 1, true)).toBeNull();
    expect(dueAttempt(9000, 1, false)).toBe(1);
  });

  it("starts nothing after the last attempt", () => {
    expect(dueAttempt(60000, 3, false)).toBeNull();
  });
});

describe("runAttempt", () => {
  const match: RecognizeResponse = {
    status: "match",
    track: {
      id: 1,
      title: "Song",
      artist: "Artist",
      album: null,
      genre: null,
      year: null,
      durationSec: 180,
      coverUrl: null,
      previewUrl: null,
    },
    saved: false,
    confidence: 0.9,
    offsetSeconds: 3,
    score: 80,
    runnerUpScore: 4,
    timings: { dbMs: 5, totalMs: 9 },
  };

  function deps(hashCount: number) {
    const request: RecognizeRequest = { fingerprintVersion: 2, hashes: [[1, 0]] };
    return {
      resample: vi.fn(async (pcm: Float32Array) => pcm.subarray(0, pcm.length / 4).slice()),
      fingerprint: vi.fn(async (pcm: Float32Array, debug: boolean) => {
        // Mimics the transfer to the worker, which detaches the buffer.
        structuredClone(pcm, { transfer: [pcm.buffer] });
        return {
          hashes: new Uint32Array(hashCount),
          anchorFrames: new Uint32Array(hashCount),
          debug: debug ? { spectrogram: undefined!, peaks: [] } : undefined,
        };
      }),
      toRequest: vi.fn(() => request),
      recognize: vi.fn(async () => match),
    } satisfies AttemptDeps;
  }

  it("resamples, fingerprints and sends the request", async () => {
    const d = deps(10);
    const audio = new Float32Array(400).fill(0.5);
    const result = await runAttempt(d, audio, 44100, false);

    expect(d.resample).toHaveBeenCalledWith(audio, 44100);
    expect(d.fingerprint).toHaveBeenCalledWith(expect.any(Float32Array), false);
    expect(d.toRequest).toHaveBeenCalledWith(
      expect.objectContaining({ hashes: expect.any(Uint32Array) }),
      false,
    );
    expect(d.recognize).toHaveBeenCalledOnce();
    expect(result.response).toBe(match);
    expect(result.debug).toBeUndefined();
  });

  it("keeps a copy of the 11,025 Hz PCM when debug is on", async () => {
    const d = deps(10);
    const result = await runAttempt(d, new Float32Array(400).fill(0.5), 44100, true);
    expect(result.pcm).toHaveLength(100);
    expect(result.pcm[0]).toBe(0.5);
    expect(result.debug).toEqual({ spectrogram: undefined, peaks: [] });
  });

  it("answers no_match without calling the API when there are no hashes", async () => {
    const d = deps(0);
    const result = await runAttempt(d, new Float32Array(400), 44100, false);
    expect(d.recognize).not.toHaveBeenCalled();
    expect(result.response).toEqual({
      status: "no_match",
      score: 0,
      timings: { dbMs: 0, totalMs: 0 },
    });
  });

  it("propagates API errors", async () => {
    const d = deps(10);
    d.recognize.mockRejectedValueOnce(new Error("boom"));
    await expect(runAttempt(d, new Float32Array(400), 44100, false)).rejects.toThrow("boom");
  });
});
