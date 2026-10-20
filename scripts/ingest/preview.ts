import { spawn } from "node:child_process";

import { DecodeError } from "./decode";

/** Length of the audio sample played from the result and the lists. */
export const PREVIEW_SECONDS = 5;
export const PREVIEW_MIME = "audio/mpeg";
/** Candidate starts are this far apart: fine enough to land on a chorus, cheap to scan. */
const STEP_SECONDS = 0.25;

/**
 * Start in seconds of the loudest `seconds`-long stretch of `pcm` (highest mean energy),
 * which in most songs falls on the chorus. A signal shorter than the window starts at 0.
 */
export function loudestWindow(pcm: Float32Array, sampleRate: number, seconds: number): number {
  const length = Math.round(seconds * sampleRate);
  if (pcm.length <= length) return 0;

  // Prefix sums of squares: the energy of any window is a difference of two entries.
  const energy = new Float64Array(pcm.length + 1);
  for (let i = 0; i < pcm.length; i++) energy[i + 1] = energy[i] + pcm[i] * pcm[i];

  const step = Math.max(1, Math.round(STEP_SECONDS * sampleRate));
  let bestStart = 0;
  let bestEnergy = -1;
  for (let start = 0; start + length <= pcm.length; start += step) {
    const value = energy[start + length] - energy[start];
    if (value > bestEnergy) {
      bestEnergy = value;
      bestStart = start;
    }
  }
  return bestStart / sampleRate;
}

/**
 * Encodes `seconds` of `file` from `startSec` as a stereo 128 kb/s MP3, with short fades so
 * the sample does not click in or out:
 *   ffmpeg -v error -ss <start> -t <seconds> -i <file> -af afade... -c:a libmp3lame -f mp3 pipe:1
 */
export function encodePreview(
  file: string,
  startSec: number,
  options: { seconds?: number; ffmpegPath?: string } = {},
): Promise<Uint8Array> {
  const seconds = options.seconds ?? PREVIEW_SECONDS;
  const ffmpeg = options.ffmpegPath ?? process.env.FFMPEG_PATH ?? "ffmpeg";
  const fadeOut = Math.max(0, seconds - 0.3).toFixed(2);
  const args = ["-v", "error", "-ss", startSec.toFixed(3), "-t", String(seconds), "-i", file];
  args.push("-vn", "-ac", "2", "-ar", "44100");
  args.push("-af", `afade=t=in:d=0.15,afade=t=out:st=${fadeOut}:d=0.3`);
  args.push("-c:a", "libmp3lame", "-b:a", "128k", "-f", "mp3", "pipe:1");

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.on("error", (error: NodeJS.ErrnoException) => {
      reject(
        error.code === "ENOENT"
          ? new DecodeError(`ffmpeg not found (${ffmpeg}). Install it or set FFMPEG_PATH.`)
          : error,
      );
    });
    child.on("close", (code) => {
      const bytes = Buffer.concat(chunks);
      if (code !== 0 || bytes.byteLength === 0) {
        const detail = Buffer.concat(errors).toString("utf8").trim().split(/\r?\n/).at(-1);
        reject(new DecodeError(`ffmpeg could not encode the sample: ${detail || `code ${code}`}`));
        return;
      }
      resolve(new Uint8Array(bytes));
    });
  });
}
