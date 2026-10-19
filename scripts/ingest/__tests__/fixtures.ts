import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/** Temporary folder for one test; `cleanup` removes it. */
export async function tempDir(): Promise<{ dir: string; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(path.join(tmpdir(), "kazammi-ingest-"));
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

export async function writeFiles(dir: string, files: Record<string, string | Uint8Array>) {
  for (const [name, content] of Object.entries(files)) {
    const file = path.join(dir, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
}

/** 16-bit PCM mono WAV with a sine of `frequency` Hz. */
export function sineWav(seconds: number, sampleRate: number, frequency = 440): Uint8Array {
  const samples = Math.round(seconds * sampleRate);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let n = 0; n < samples; n++) {
    const value = Math.round(16000 * Math.sin((2 * Math.PI * frequency * n) / sampleRate));
    buffer.writeInt16LE(value, 44 + n * 2);
  }
  return new Uint8Array(buffer);
}
