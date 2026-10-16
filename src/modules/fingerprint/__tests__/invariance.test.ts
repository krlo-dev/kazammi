import { describe, expect, it } from "vitest";

import { fingerprint } from "../fingerprint";
import { DEFAULT_PARAMS } from "../params";
import { melody } from "./signals";

// Web Crypto is a global in both Node and the browser, so the test stays isomorphic.
async function sha256(bytes: Uint32Array): Promise<string> {
  // The copy guarantees a plain ArrayBuffer, which is what BufferSource accepts.
  const digest = await crypto.subtle.digest("SHA-256", new Uint32Array(bytes));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

const pairsOf = (fp: { hashes: Uint32Array; anchorFrames: Uint32Array }) =>
  Array.from(fp.hashes, (hash, i) => `${hash}@${fp.anchorFrames[i]}`);

describe("fingerprint invariances", () => {
  it("is deterministic: the SHA-256 of the hashes of a fixed signal never changes", async () => {
    const { hashes, anchorFrames } = fingerprint(melody(10, 42));
    // If this snapshot changes, the algorithm or its params changed: bump FINGERPRINT_VERSION.
    expect({ count: hashes.length, sha256: await sha256(hashes) }).toMatchInlineSnapshot(`
      {
        "count": 2100,
        "sha256": "fcfd0f3dca4eac71e16465d48c3f7cd1ba74bd0ba68367cc9174b4aecfa1cedf",
      }
    `);
    expect(await sha256(anchorFrames)).toMatchInlineSnapshot(
      `"6af958f9a81c7aa6393199327f5b54c766c2a2942955d86151ec525492768eb1"`,
    );
    expect(fingerprint(melody(10, 42)).hashes).toEqual(hashes);
  });

  it("shifts anchor times by exactly d when the signal is delayed by d frames", () => {
    const signal = melody(8, 7);
    const d = 13;
    const delayed = new Float32Array(signal.length + d * DEFAULT_PARAMS.hopSize);
    delayed.set(signal, d * DEFAULT_PARAMS.hopSize);

    const original = fingerprint(signal);
    const shifted = fingerprint(delayed);
    // Frames before d straddle the padding and the start of the signal, so they have no
    // counterpart in the original. From frame d on, both spectrograms are identical.
    const common = shifted.anchorFrames.findIndex((frame) => frame >= d);
    expect(shifted.hashes.slice(common)).toEqual(original.hashes);
    expect(Array.from(shifted.anchorFrames.slice(common))).toEqual(
      Array.from(original.anchorFrames, (frame) => frame + d),
    );
  });

  it("keeps the hashes of the common region when the start is cut by d frames", () => {
    const signal = melody(8, 9);
    const d = 20;
    const cut = signal.subarray(d * DEFAULT_PARAMS.hopSize);

    const original = new Set(pairsOf(fingerprint(signal)));
    const cutFp = fingerprint(cut);
    // Re-express the cut fingerprint on the original time axis.
    const realigned = pairsOf({
      hashes: cutFp.hashes,
      anchorFrames: cutFp.anchorFrames.map((frame) => frame + d),
    });
    const matches = realigned.filter((pair) => original.has(pair)).length;
    expect(realigned.length).toBeGreaterThan(0);
    expect(matches / realigned.length).toBeGreaterThan(0.95);
  });

  it.each([0.1, 0.5, 3])("produces the same hashes when the volume is scaled by %s", (gain) => {
    const signal = melody(6, 5);
    const scaled = signal.map((x) => x * gain);
    const a = fingerprint(signal);
    const b = fingerprint(scaled);
    expect(b.hashes).toEqual(a.hashes);
    expect(b.anchorFrames).toEqual(a.anchorFrames);
  });
});
