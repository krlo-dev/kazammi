import { describe, expect, it } from "vitest";

import { fingerprint } from "@/modules/fingerprint";

import { handleFingerprintRequest } from "../worker-protocol";

const SAMPLE_RATE = 11025;

// Same seeded signal as melody() in the fingerprint tests, copied here because a module
// only imports another one through its index.ts.
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function melody(seconds: number, seed: number): Float32Array {
  const next = mulberry32(seed);
  const length = Math.round(seconds * SAMPLE_RATE);
  const segment = Math.round(0.5 * SAMPLE_RATE);
  const out = new Float32Array(length);
  let freqs = [0, 0, 0];
  for (let n = 0; n < length; n++) {
    if (n % segment === 0) freqs = freqs.map(() => 200 + next() * 3800);
    let value = 0;
    for (const f of freqs) value += Math.sin((2 * Math.PI * f * n) / SAMPLE_RATE);
    out[n] = value / 3;
  }
  return out;
}

async function sha256(bytes: Uint32Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint32Array(bytes));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

describe("handleFingerprintRequest", () => {
  it("returns the same hashes as fingerprint() in Node (snapshot of 03-fingerprint)", async () => {
    const { reply, transfer } = handleFingerprintRequest({
      id: 7,
      pcm: melody(10, 42),
      debug: false,
    });
    if (!reply.ok) throw new Error(reply.message);

    const expected = fingerprint(melody(10, 42));
    expect(reply.id).toBe(7);
    expect(reply.hashes).toEqual(expected.hashes);
    expect(reply.anchorFrames).toEqual(expected.anchorFrames);
    expect(reply.debug).toBeUndefined();
    // Same values as the inline snapshot of fingerprint/__tests__/invariance.test.ts.
    expect({ count: reply.hashes.length, sha256: await sha256(reply.hashes) }).toEqual({
      count: 404,
      sha256: "9afe158b753b27349b6c907a1e1938930dd9fe7bd47665cde084d5b1d09f0054",
    });
    expect(transfer).toEqual([reply.hashes.buffer, reply.anchorFrames.buffer]);
  });

  it("adds the spectrogram and the peaks when debug is on", () => {
    const { reply, transfer } = handleFingerprintRequest({
      id: 1,
      pcm: melody(3, 5),
      debug: true,
    });
    if (!reply.ok) throw new Error(reply.message);

    const expected = fingerprint(melody(3, 5), { debug: true });
    expect(reply.hashes).toEqual(expected.hashes);
    expect(reply.debug?.peaks).toEqual(expected.debug.peaks);
    expect(reply.debug?.spectrogram.frames).toBe(expected.debug.spectrogram.frames);
    expect(transfer).toContain(reply.debug?.spectrogram.data.buffer);
  });

  it("answers ok: false instead of throwing", () => {
    const broken = { id: 3, pcm: null as unknown as Float32Array, debug: false };
    const { reply, transfer } = handleFingerprintRequest(broken);
    expect(reply).toMatchObject({ id: 3, ok: false });
    expect(transfer).toEqual([]);
  });
});
