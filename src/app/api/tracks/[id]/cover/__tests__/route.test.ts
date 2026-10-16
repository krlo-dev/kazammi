import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createCatalogRepository } from "@/modules/catalog";
import type { Database } from "@/modules/db";
import { createTestDb } from "@/modules/db/testing";

const state = vi.hoisted(() => ({ db: undefined as unknown }));

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
  });
  afterAll(() => close());

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
