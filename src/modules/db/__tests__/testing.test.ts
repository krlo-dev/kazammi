import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "../client";
import { createTestDb } from "../testing";

const rowsOf = <T>(result: unknown): T[] =>
  Array.isArray(result) ? (result as T[]) : (result as { rows: T[] }).rows;

describe("createTestDb", () => {
  let db: Database;
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ db, close } = await createTestDb());
  });
  afterAll(() => close());

  it("applies the migrations and creates the catalog tables", async () => {
    const tables = rowsOf<{ tablename: string }>(
      await db.execute(
        sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
      ),
    ).map((row) => row.tablename);
    expect(tables).toEqual(
      expect.arrayContaining(["app_meta", "fingerprints", "track_covers", "tracks"]),
    );
  });

  it("creates the covering hash index from the custom migration", async () => {
    const [index] = rowsOf<{ indexdef: string }>(
      await db.execute(
        sql`SELECT indexdef FROM pg_indexes WHERE indexname = 'fingerprints_hash_idx'`,
      ),
    );
    expect(index.indexdef).toMatch(/\(hash\) INCLUDE \(track_id, anchor_frame\)/);
  });

  it("returns an independent empty database on every call", async () => {
    const other = await createTestDb();
    await other.db.execute(sql`INSERT INTO app_meta (key, value) VALUES ('x', '1')`);
    const rows = rowsOf(await db.execute(sql`SELECT * FROM app_meta WHERE key = 'x'`));
    expect(rows).toHaveLength(0);
    await other.close();
  });
});
