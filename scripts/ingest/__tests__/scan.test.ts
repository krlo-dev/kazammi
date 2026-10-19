import { createHash } from "node:crypto";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { listAudioFiles, sha256File } from "../scan";
import { tempDir, writeFiles } from "./fixtures";

describe("scan", () => {
  let dir: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    ({ dir, cleanup } = await tempDir());
  });
  afterEach(() => cleanup());

  it("lists supported audio files recursively, sorted, with forward-slash relative paths", async () => {
    await writeFiles(dir, {
      "b.mp3": "b",
      "A - Song.FLAC": "a",
      "artist/c.m4a": "c",
      "artist/deep/d.ogg": "d",
      "e.wav": "e",
      "cover.jpg": "x",
      "notes.txt": "x",
      "artist/f.mp3.part": "x",
    });
    const files = await listAudioFiles(dir);
    expect(files.map((f) => f.relativePath)).toEqual([
      "A - Song.FLAC",
      "artist/c.m4a",
      "artist/deep/d.ogg",
      "b.mp3",
      "e.wav",
    ]);
    expect(files[1].absolutePath).toBe(path.join(dir, "artist", "c.m4a"));
  });

  it("returns an empty list for a folder without audio", async () => {
    await writeFiles(dir, { "readme.md": "x" });
    expect(await listAudioFiles(dir)).toEqual([]);
  });

  it("hashes file contents with SHA-256", async () => {
    await writeFiles(dir, { "a.mp3": "hello", "b.mp3": "hello", "c.mp3": "other" });
    const expected = createHash("sha256").update("hello").digest("hex");
    expect(await sha256File(path.join(dir, "a.mp3"))).toBe(expected);
    expect(await sha256File(path.join(dir, "b.mp3"))).toBe(expected);
    expect(await sha256File(path.join(dir, "c.mp3"))).not.toBe(expected);
  });

  it("rejects when the file does not exist", async () => {
    await expect(sha256File(path.join(dir, "missing.mp3"))).rejects.toThrow();
  });
});
