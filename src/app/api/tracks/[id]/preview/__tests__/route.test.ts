import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { getAuth } from "@/modules/auth";
import { createCatalogRepository } from "@/modules/catalog";
import type { Database } from "@/modules/db";
import { createTestDb } from "@/modules/db/testing";

const state = vi.hoisted(() => ({ db: undefined as unknown, headers: new Headers() }));

// The real auth instance (getAuth) runs on the same PGlite database as the catalog.
vi.stubEnv("DATABASE_URL", "postgres://unused@localhost/test");
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters!");
vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
vi.mock("next/headers", () => ({
  headers: async () => state.headers,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));

vi.mock("@/modules/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/db")>()),
  getDb: () => state.db,
}));

const { GET } = await import("../route");

const call = (id: string) =>
  GET(new Request(`http://localhost/api/tracks/${id}/preview`), {
    params: Promise.resolve({ id }),
  });

describe("GET /api/tracks/[id]/preview", () => {
  let close: () => Promise<void>;
  let withPreview: number;
  let withoutPreview: number;

  beforeAll(async () => {
    const test = await createTestDb();
    state.db = test.db;
    close = test.close;
    const catalog = createCatalogRepository(test.db as Database);
    const base = {
      album: null,
      genre: null,
      year: null,
      durationSec: 10,
      artist: "Artist",
      hashes: new Uint32Array(0),
      anchorFrames: new Uint32Array(0),
      fingerprintVersion: 1,
    };
    withPreview = await catalog.insertTrackWithFingerprints({
      ...base,
      track: { ...base, sourcePath: "a.mp3", contentSha256: "a", title: "A" },
      cover: null,
    });
    await catalog.setPreview(withPreview, {
      mime: "audio/mpeg",
      startSec: 42,
      data: Uint8Array.from([0xff, 0xfb, 0x90, 0x64]),
    });
    withoutPreview = await catalog.insertTrackWithFingerprints({
      ...base,
      track: { ...base, sourcePath: "b.mp3", contentSha256: "b", title: "B" },
      cover: null,
    });

    const { headers } = await getAuth().api.signUpEmail({
      body: { name: "Ana", email: "ana@example.com", password: "una-clave-segura" },
      returnHeaders: true,
    });
    const cookie = headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    state.headers = new Headers({ cookie });
  });
  afterAll(() => close());

  it("answers 401 without a valid session", async () => {
    const signedIn = state.headers;
    state.headers = new Headers();
    try {
      const response = await call(String(withPreview));
      expect(response.status).toBe(401);
      expect(response.headers.get("Content-Type")).not.toBe("audio/mpeg");
    } finally {
      state.headers = signedIn;
    }
  });

  it("serves the sample as mp3 with immutable caching", async () => {
    const response = await call(String(withPreview));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([
      0xff, 0xfb, 0x90, 0x64,
    ]);
  });

  it("returns 404 when the track has no sample or does not exist", async () => {
    expect((await call(String(withoutPreview))).status).toBe(404);
    expect((await call("999")).status).toBe(404);
  });

  it.each(["abc", "0", "-1", "1.5", "1e3"])("returns 400 for invalid id %s", async (id) => {
    expect((await call(id)).status).toBe(400);
  });
});
