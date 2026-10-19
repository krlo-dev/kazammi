import { describe, expect, it } from "vitest";

import { fingerprint } from "../fingerprint";
import { decodeHash } from "../hash";
import { DEFAULT_PARAMS } from "../params";
import { melody, SAMPLE_RATE } from "./signals";

describe("fingerprint", () => {
  it("turns a synthetic 3-sine mix into hashes whose fields stay in range", () => {
    const { hashes, anchorFrames } = fingerprint(melody(10, 1));
    expect(hashes.length).toBeGreaterThan(100);
    expect(anchorFrames).toHaveLength(hashes.length);
    for (const hash of hashes) {
      const { anchorBin, pointBin, deltaFrames } = decodeHash(hash);
      expect(anchorBin).toBeGreaterThanOrEqual(1);
      expect(anchorBin).toBeLessThan(512);
      expect(pointBin).toBeGreaterThanOrEqual(1);
      expect(pointBin).toBeLessThan(512);
      expect(deltaFrames).toBeGreaterThanOrEqual(1);
      expect(deltaFrames).toBeLessThanOrEqual(64);
    }
  });

  it("emits anchor frames in non-decreasing order", () => {
    const { anchorFrames } = fingerprint(melody(5, 2));
    for (let i = 1; i < anchorFrames.length; i++) {
      expect(anchorFrames[i]).toBeGreaterThanOrEqual(anchorFrames[i - 1]);
    }
  });

  it("returns intermediates only in debug mode", () => {
    const signal = melody(3, 3);
    const plain = fingerprint(signal);
    expect(plain).not.toHaveProperty("debug");

    const withDebug = fingerprint(signal, { debug: true });
    expect(withDebug.hashes).toEqual(plain.hashes);
    expect(withDebug.anchorFrames).toEqual(plain.anchorFrames);
    expect(withDebug.debug.spectrogram.bins).toBe(513);
    expect(withDebug.debug.spectrogram.sampleRate).toBe(SAMPLE_RATE);
    expect(withDebug.debug.peaks.length).toBeGreaterThan(0);
  });

  it("uses custom params when given", () => {
    const signal = melody(5, 4);
    const fewer = fingerprint(signal, {
      params: { ...DEFAULT_PARAMS, targetZone: { ...DEFAULT_PARAMS.targetZone, fanOut: 1 } },
    });
    expect(fewer.hashes.length).toBeLessThan(fingerprint(signal).hashes.length);
  });

  it("returns no hashes for silence or very short input", () => {
    expect(fingerprint(new Float32Array(SAMPLE_RATE)).hashes).toHaveLength(0);
    expect(fingerprint(new Float32Array(100)).hashes).toHaveLength(0);
  });
});
