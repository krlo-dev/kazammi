import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import type { Database } from "./client";
import * as schema from "./schema";

const migrationsFolder = fileURLToPath(new URL("../../../drizzle", import.meta.url));

/**
 * In-memory Postgres (PGlite) with the real migrations applied. Tests only:
 * every call returns a fresh, empty database.
 */
export async function createTestDb(): Promise<{ db: Database; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return { db, close: () => client.close() };
}
