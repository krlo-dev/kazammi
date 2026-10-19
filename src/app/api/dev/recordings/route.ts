// Development only: stores each recognition attempt as a WAV in data/recordings/ (gitignored),
// so the fingerprint can be tuned against real microphone recordings instead of simulations.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { withApiAuth } from "@/modules/auth";

const SAMPLE_RATE = 11025;
const DIR = path.join(process.cwd(), "data", "recordings");
const MAX_BYTES = 20 * SAMPLE_RATE * 4;

/** Mono 16-bit PCM WAV. */
function toWav(pcm: Float32Array): Buffer {
  const data = Buffer.alloc(pcm.length * 2);
  for (let i = 0; i < pcm.length; i++) {
    const v = Math.max(-1, Math.min(1, pcm[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const slug = (value: string | null) => (value ?? "").replace(/[^\w-]+/g, "_").slice(0, 60);

export const POST = withApiAuth(async (_user, request: Request) => {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES || bytes.byteLength % 4 !== 0) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const url = new URL(request.url);
  const name = [
    new Date().toISOString().replace(/[:.]/g, "-"),
    `a${slug(url.searchParams.get("attempt"))}`,
    slug(url.searchParams.get("status")),
    `s${slug(url.searchParams.get("score"))}`,
    slug(url.searchParams.get("title")),
  ]
    .filter(Boolean)
    .join("_");
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `${name}.wav`), toWav(new Float32Array(bytes)));
  return new Response(null, { status: 204 });
});
