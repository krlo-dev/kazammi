import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

export const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set([
  ".mp3",
  ".m4a",
  ".flac",
  ".wav",
  ".ogg",
]);

export interface AudioFile {
  /** Absolute path on disk. */
  absolutePath: string;
  /** Path relative to the scanned folder, with forward slashes (stored as source_path). */
  relativePath: string;
}

/** Supported audio files under `dir`, recursively, sorted by relative path. */
export async function listAudioFiles(dir: string): Promise<AudioFile[]> {
  const root = path.resolve(dir);
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter(
      (entry) => entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => {
      const absolutePath = path.join(entry.parentPath, entry.name);
      const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
      return { absolutePath, relativePath };
    })
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/** SHA-256 of a file's bytes, streamed so large files never sit in memory. */
export function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}
