import path from "node:path";

import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { MetadataError, normalizeCover, parseFilename, readMetadata } from "../metadata";
import { sineWav, tempDir, writeFiles } from "./fixtures";

describe("parseFilename", () => {
  it.each([
    ["Daft Punk - One More Time.mp3", { artist: "Daft Punk", title: "One More Time" }],
    ["artist/AC - DC - Back In Black.flac", { artist: "AC", title: "DC - Back In Black" }],
    ["  Spaced  -  Out .ogg", { artist: "Spaced", title: "Out" }],
  ])("parses %s", (file, expected) => {
    expect(parseFilename(file)).toEqual(expected);
  });

  it.each(["NoSeparator.mp3", "Artist -Title.mp3", " - Title.mp3", "Artist - .mp3"])(
    "returns null for %s",
    (file) => {
      expect(parseFilename(file)).toBeNull();
    },
  );
});

describe("readMetadata", () => {
  let dir: string;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ dir, cleanup } = await tempDir());
    // Plain WAV files carry no tags, so title and artist must come from the file name.
    await writeFiles(dir, {
      "Hansel Y Raul - Ayer.wav": sineWav(0.1, 8000),
      "untitled.wav": sineWav(0.1, 8000),
    });
  });
  afterAll(() => cleanup());

  it("falls back to 'Artista - Título' when the tags have no title or artist", async () => {
    expect(await readMetadata(path.join(dir, "Hansel Y Raul - Ayer.wav"))).toEqual({
      title: "Ayer",
      artist: "Hansel Y Raul",
      album: null,
      genre: null,
      year: null,
      picture: null,
    });
  });

  it("rejects files without tags and without a parseable name", async () => {
    await expect(readMetadata(path.join(dir, "untitled.wav"))).rejects.toThrow(MetadataError);
  });
});

describe("normalizeCover", () => {
  it("turns any image into a 512 x 512 webp", async () => {
    const jpeg = await sharp({
      create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 30, b: 90 } },
    })
      .jpeg()
      .toBuffer();
    const cover = await normalizeCover(new Uint8Array(jpeg));
    expect(cover).toBeInstanceOf(Uint8Array);
    const info = await sharp(cover).metadata();
    expect(info).toMatchObject({ format: "webp", width: 512, height: 512 });
  });

  it("rejects bytes that are not an image", async () => {
    await expect(normalizeCover(Uint8Array.from([1, 2, 3]))).rejects.toThrow();
  });
});
