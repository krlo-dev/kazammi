import { spawn } from "node:child_process";

export class DecodeError extends Error {
  override name = "DecodeError";
}

export interface DecodeOptions {
  sampleRate: number;
  /** ffmpeg binary. Defaults to $FFMPEG_PATH, then `ffmpeg` from the PATH. */
  ffmpegPath?: string;
}

/**
 * Decodes any audio file ffmpeg understands into mono 32-bit float PCM:
 *   ffmpeg -v error -i <file> -ac 1 -ar <sampleRate> -f f32le pipe:1
 */
export function decodeToPcm(file: string, options: DecodeOptions): Promise<Float32Array> {
  const ffmpeg = options.ffmpegPath ?? process.env.FFMPEG_PATH ?? "ffmpeg";
  const args = ["-v", "error", "-i", file, "-ac", "1", "-ar", String(options.sampleRate)];
  args.push("-f", "f32le", "pipe:1");

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
      if (code !== 0) {
        const detail = Buffer.concat(errors).toString("utf8").trim().split(/\r?\n/).at(-1);
        reject(new DecodeError(`ffmpeg exited with code ${code}: ${detail || "no details"}`));
        return;
      }
      const bytes = Buffer.concat(chunks);
      if (bytes.byteLength % 4 !== 0) {
        reject(new DecodeError(`ffmpeg returned ${bytes.byteLength} bytes, not a multiple of 4`));
        return;
      }
      // Copy into a fresh, 4-byte aligned buffer: Buffer.concat may return a slice of
      // Node's shared pool whose byteOffset is not a multiple of 4.
      const pcm = new Float32Array(bytes.byteLength / 4);
      new Uint8Array(pcm.buffer).set(bytes);
      resolve(pcm);
    });
  });
}
