import path from "node:path";

import { parseFile } from "music-metadata";
import sharp from "sharp";

export const COVER_SIZE = 512;
export const COVER_MIME = "image/webp";

export class MetadataError extends Error {
  override name = "MetadataError";
}

export interface TrackMetadata {
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  year: number | null;
  /** Embedded picture as found in the file (any format), not yet normalized. */
  picture: Uint8Array | null;
}

const clean = (value: string | undefined | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/** `Artista - Título.ext` -> { artist, title }, or null when the name has another shape. */
export function parseFilename(file: string): { artist: string; title: string } | null {
  const base = path.basename(file, path.extname(file));
  const separator = base.indexOf(" - ");
  if (separator < 0) return null;
  const artist = clean(base.slice(0, separator));
  const title = clean(base.slice(separator + 3));
  return artist && title ? { artist, title } : null;
}

/**
 * Title, artist, album, genre, year and picture from the file tags. Missing title or
 * artist fall back to the file name; if that fails too, throws MetadataError.
 */
export async function readMetadata(file: string): Promise<TrackMetadata> {
  const { common } = await parseFile(file, { duration: false });
  let title = clean(common.title);
  let artist = clean(common.artist);
  if (!title || !artist) {
    const fromName = parseFilename(file);
    title ??= fromName?.title ?? null;
    artist ??= fromName?.artist ?? null;
  }
  if (!title || !artist) {
    throw new MetadataError(
      "no title/artist in the tags and the file name is not 'Artista - Título'",
    );
  }
  const year = common.year && Number.isInteger(common.year) ? common.year : null;
  return {
    title,
    artist,
    album: clean(common.album),
    genre: clean(common.genre?.[0]),
    year,
    picture: common.picture?.[0]?.data ?? null,
  };
}

/** Any image -> square 512 x 512 webp, cropped to fill (fit: cover). */
export async function normalizeCover(picture: Uint8Array): Promise<Uint8Array> {
  const webp = await sharp(picture)
    .resize(COVER_SIZE, COVER_SIZE, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
  return new Uint8Array(webp);
}
