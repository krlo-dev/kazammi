import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getServerEnv } from "@/shared";

import * as schema from "./schema";

/**
 * Driver-agnostic database type: repositories accept it so the same code runs on
 * postgres.js (Neon) and on PGlite (tests).
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Database | undefined;

/** One connection per process, created lazily on first use. */
export function getDb(): Database {
  if (!instance) {
    // prepare: false is required by Neon's pooled endpoint (PgBouncer, transaction mode).
    // max: 1 because each serverless instance serves one request at a time.
    const client = postgres(getServerEnv().DATABASE_URL, { prepare: false, max: 1 });
    instance = drizzle(client, { schema });
  }
  return instance;
}
