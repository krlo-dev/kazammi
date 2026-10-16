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
  GET(new Request(`http://localhost/api/tracks/${id}/cover`), {
    params: Promise.resolve({ id }),
  });

describe("GET /api/tracks/[id]/cover", () => {
  let close: () => Promise<void>;
  let withCover: number;
  let withoutCover: number;

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
    withCover = await catalog.insertTrackWithFingerprints({
      ...base,
      track: { ...base, sourcePath: "a.mp3", contentSha256: "a", title: "A" },
      cover: { mime: "image/webp", data: Uint8Array.from([82, 73, 70, 70]) },
    });
    withoutCover = await catalog.insertTrackWithFingerprints({
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
      const response = await call(String(withCover));
      expect(response.status).toBe(401);
      expect(response.headers.get("Content-Type")).not.toBe("image/webp");
    } finally {
      state.headers = signedIn;
    }
  });

  it("serves the cover as webp with immutable caching", async () => {
    const response = await call(String(withCover));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([82, 73, 70, 70]);
  });

  it("returns 404 when the track has no cover or does not exist", async () => {
    expect((await call(String(withoutCover))).status).toBe(404);
    expect((await call("999")).status).toBe(404);
  });

  it.each(["abc", "0", "-1", "1.5", "1e3"])("returns 400 for invalid id %s", async (id) => {
    expect((await call(id)).status).toBe(400);
  });
});
