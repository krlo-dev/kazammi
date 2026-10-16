import { spawnSync } from "node:child_process";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DecodeError, decodeToPcm } from "../decode";
import { sineWav, tempDir, writeFiles } from "./fixtures";

const SAMPLE_RATE = 11025;
const ffmpegPath = process.env.FFMPEG_PATH ?? "ffmpeg";
const hasFfmpeg = spawnSync(ffmpegPath, ["-version"]).status === 0;

describe("decodeToPcm", () => {
  let dir: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ dir, cleanup } = await tempDir());
    await writeFiles(dir, {
      "long.wav": sineWav(210, 8000), // 3:30, small source rate to keep the fixture light
      "short.wav": sineWav(1, 44100),
      "broken.mp3": "this is not audio",
    });
  });
  afterAll(() => cleanup());

  it.skipIf(!hasFfmpeg)(
    "turns 3:30 of audio into ~2,315,250 mono samples at 11,025 Hz",
    async () => {
      const pcm = await decodeToPcm(path.join(dir, "long.wav"), { sampleRate: SAMPLE_RATE });
      expect(pcm).toBeInstanceOf(Float32Array);
      expect(Math.abs(pcm.length - 210 * SAMPLE_RATE)).toBeLessThan(SAMPLE_RATE * 0.05);
    },
  );

  it.skipIf(!hasFfmpeg)(
    "keeps the signal: a 440 Hz sine stays a sine of the same amplitude",
    async () => {
      const pcm = await decodeToPcm(path.join(dir, "short.wav"), { sampleRate: SAMPLE_RATE });
      expect(Math.abs(pcm.length - SAMPLE_RATE)).toBeLessThan(20);
      let peak = 0;
      for (const value of pcm) peak = Math.max(peak, Math.abs(value));
      expect(peak).toBeGreaterThan(0.45);
      expect(peak).toBeLessThan(0.52); // 16000 / 32768
    },
  );

  it.skipIf(!hasFfmpeg)("rejects files ffmpeg cannot decode with a DecodeError", async () => {
    await expect(
      decodeToPcm(path.join(dir, "broken.mp3"), { sampleRate: SAMPLE_RATE }),
    ).rejects.toThrow(DecodeError);
  });

  it("explains how to fix a missing ffmpeg", async () => {
    await expect(
      decodeToPcm(path.join(dir, "short.wav"), {
        sampleRate: SAMPLE_RATE,
        ffmpegPath: path.join(dir, "no-such-ffmpeg"),
      }),
    ).rejects.toThrow(/FFMPEG_PATH/);
  });
});
