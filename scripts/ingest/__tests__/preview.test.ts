import { spawnSync } from "node:child_process";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { encodePreview, loudestWindow, PREVIEW_SECONDS } from "../preview";
import { sineWav, tempDir, writeFiles } from "./fixtures";

const ffmpegPath = process.env.FFMPEG_PATH ?? "ffmpeg";
const hasFfmpeg = spawnSync(ffmpegPath, ["-version"]).status === 0;

describe("loudestWindow", () => {
  const rate = 1000;

  it("starts the window on the loudest stretch", () => {
    const pcm = new Float32Array(60 * rate).fill(0.1);
    pcm.fill(0.8, 30 * rate, 37 * rate); // a 7 s chorus at 0:30
    const start = loudestWindow(pcm, rate, 5);
    expect(start).toBeGreaterThanOrEqual(30);
    expect(start + 5).toBeLessThanOrEqual(37);
  });

  it("starts at 0 when the signal is shorter than the window", () => {
    expect(loudestWindow(new Float32Array(3 * rate).fill(0.5), rate, 5)).toBe(0);
  });

  it("never runs past the end of the signal", () => {
    const pcm = new Float32Array(20 * rate).fill(0.1);
    pcm.fill(0.9, 18 * rate); // loudest at the very end
    const start = loudestWindow(pcm, rate, 5);
    expect(start + 5).toBeLessThanOrEqual(20);
    expect(start).toBeGreaterThanOrEqual(14);
  });
});

describe("encodePreview", () => {
  let dir: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ dir, cleanup } = await tempDir());
    await writeFiles(dir, { "song.wav": sineWav(20, 22050), "broken.mp3": "not audio" });
  });
  afterAll(() => cleanup());

  it.skipIf(!hasFfmpeg)("encodes 5 s of the file as an MP3", async () => {
    const mp3 = await encodePreview(path.join(dir, "song.wav"), 8);
    // MPEG audio frames start with an 11-bit sync word (0xFFE), maybe after an ID3 tag.
    const id3 = mp3[0] === 0x49 && mp3[1] === 0x44 && mp3[2] === 0x33;
    if (!id3) expect([mp3[0], mp3[1] & 0xe0]).toEqual([0xff, 0xe0]);
    // 128 kb/s for 5 s is ~80 KB.
    expect(mp3.byteLength).toBeGreaterThan(60_000);
    expect(mp3.byteLength).toBeLessThan(110_000);
    expect(PREVIEW_SECONDS).toBe(5);
  });

  it.skipIf(!hasFfmpeg)("rejects a file ffmpeg cannot read", async () => {
    await expect(encodePreview(path.join(dir, "broken.mp3"), 0)).rejects.toThrow();
  });
});
