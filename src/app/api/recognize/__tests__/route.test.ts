import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getAuth } from "@/modules/auth";
import { createCatalogRepository, type CatalogRepository } from "@/modules/catalog";
import type { Database } from "@/modules/db";
import { createTestDb } from "@/modules/db/testing";
import { fingerprint, FINGERPRINT_VERSION } from "@/modules/fingerprint";
import { createLibraryService } from "@/modules/library";
import { recognizeResponseSchema } from "@/shared";

const state = vi.hoisted(() => ({ db: undefined as unknown, headers: new Headers() }));

vi.stubEnv("DATABASE_URL", "postgres://unused@localhost/test");
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters!");
vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
vi.mock("@/modules/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/db")>()),
  getDb: () => state.db,
}));
vi.mock("next/headers", () => ({
  headers: async () => state.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

const { POST } = await import("../route");

const SAMPLE_RATE = 11025;

/** mulberry32: seeded PRNG so every synthetic song is different and reproducible. */
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

/** Synthetic song: 3 sines whose frequencies (200 Hz to 4 kHz) change every 0.5 s. */
function melody(seconds: number, seed: number): Float32Array {
  const next = mulberry32(seed);
  const out = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  const segment = SAMPLE_RATE / 2;
  let freqs = [0, 0, 0];
  for (let n = 0; n < out.length; n++) {
    if (n % segment === 0) freqs = freqs.map(() => 200 + next() * 3800);
    let value = 0;
    for (const f of freqs) value += Math.sin((2 * Math.PI * f * n) / SAMPLE_RATE);
    out[n] = value / 3;
  }
  return out;
}

const pairsOf = (pcm: Float32Array) => {
  const { hashes, anchorFrames } = fingerprint(pcm);
  return Array.from(hashes, (hash, i) => [hash, anchorFrames[i]]);
};

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/recognize", () => {
  let close: () => Promise<void>;
  let catalog: CatalogRepository;
  let songId: number;
  let song: Float32Array;
  let cookie: string;

  beforeAll(async () => {
    const test = await createTestDb();
    state.db = test.db;
    close = test.close;
    catalog = createCatalogRepository(test.db as Database);

    for (const seed of [1, 2, 3]) {
      const pcm = melody(40, seed);
      const { hashes, anchorFrames } = fingerprint(pcm);
      const id = await catalog.insertTrackWithFingerprints({
        track: {
          sourcePath: `song-${seed}.mp3`,
          contentSha256: `sha-${seed}`,
          title: `Song ${seed}`,
          artist: "Artist",
          album: null,
          genre: null,
          year: null,
          durationSec: 40,
        },
        cover: seed === 2 ? { mime: "image/webp", data: Uint8Array.from([1]) } : null,
        hashes,
        anchorFrames,
        fingerprintVersion: FINGERPRINT_VERSION,
      });
      if (seed === 2) {
        songId = id;
        song = pcm;
      }
    }
    await catalog.setFingerprintVersion(FINGERPRINT_VERSION);

    const { headers } = await getAuth().api.signUpEmail({
      body: { name: "Ana", email: "ana@example.com", password: "una-clave-segura" },
      returnHeaders: true,
    });
    cookie = headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    state.headers = new Headers({ cookie });
  });
  afterAll(() => close());

  it("recognizes a 10 s segment of an indexed song with its offset", async () => {
    const start = 12 * SAMPLE_RATE;
    const segment = song.slice(start, start + 10 * SAMPLE_RATE);
    const response = await post({
      fingerprintVersion: FINGERPRINT_VERSION,
      hashes: pairsOf(segment),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = recognizeResponseSchema.parse(await response.json());
    if (body.status !== "match") throw new Error(`expected a match, got score ${body.score}`);
    expect(body.track).toMatchObject({
      id: songId,
      title: "Song 2",
      coverUrl: `/api/tracks/${songId}/cover`,
    });
    expect(body.saved).toBe(false);
    expect(Math.abs(body.offsetSeconds - 12)).toBeLessThanOrEqual(512 / SAMPLE_RATE);
    expect(body.score).toBeGreaterThan(body.runnerUpScore * 2);
    expect(body).not.toHaveProperty("debug");
  });

  it("returns the offset histogram with debug: true", async () => {
    const segment = song.slice(5 * SAMPLE_RATE, 15 * SAMPLE_RATE);
    const response = await post({
      fingerprintVersion: FINGERPRINT_VERSION,
      hashes: pairsOf(segment),
      debug: true,
    });
    const body = recognizeResponseSchema.parse(await response.json());
    if (body.status !== "match") throw new Error("expected a match");
    const top = body.debug!.histogram.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(top[1]).toBe(body.score);
  });

  it("reports saved: true once the session user saved the track", async () => {
    const session = await getAuth().api.getSession({ headers: state.headers });
    await createLibraryService(state.db as Database).saveTrack(session!.user.id, songId);

    const segment = song.slice(20 * SAMPLE_RATE, 30 * SAMPLE_RATE);
    const response = await post({
      fingerprintVersion: FINGERPRINT_VERSION,
      hashes: pairsOf(segment),
    });
    const body = recognizeResponseSchema.parse(await response.json());
    if (body.status !== "match") throw new Error("expected a match");
    expect(body.saved).toBe(true);
  });

  it("answers no_match for audio that is not in the catalog", async () => {
    const response = await post({
      fingerprintVersion: FINGERPRINT_VERSION,
      hashes: pairsOf(melody(10, 99)),
    });
    const body = recognizeResponseSchema.parse(await response.json());
    expect(body.status).toBe("no_match");
  });

  it("answers 401 without a session and never queries the fingerprints", async () => {
    const spy = vi.spyOn(state.db as Database, "execute");
    state.headers = new Headers();
    try {
      const response = await post({ fingerprintVersion: FINGERPRINT_VERSION, hashes: [[1, 0]] });
      expect(response.status).toBe(401);
      const queries = spy.mock.calls.map((call) => JSON.stringify(call[0]));
      expect(queries.some((q) => q.includes("fingerprints"))).toBe(false);
    } finally {
      state.headers = new Headers({ cookie });
      spy.mockRestore();
    }
  });

  it("answers 409 for another fingerprint version", async () => {
    const response = await post({ fingerprintVersion: FINGERPRINT_VERSION + 1, hashes: [[1, 0]] });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "version_mismatch" });
  });

  it.each([
    ["not json", "{"],
    ["0 hashes", { fingerprintVersion: 1, hashes: [] }],
    [
      "more than 20,000 hashes",
      { fingerprintVersion: 1, hashes: Array.from({ length: 20_001 }, () => [1, 0]) },
    ],
    ["missing version", { hashes: [[1, 0]] }],
  ])("answers 400 for %s", async (_name, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalid_request" });
  });
});
