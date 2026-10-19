// Public API of the db module. Import this module only through this file
// (tests may also use ./testing). Server and Node scripts only.
export { getDb, type Database } from "./client";
export * from "./schema";
/** Tables (and relations) Better Auth reads and writes, for its Drizzle adapter. */
export * as authSchema from "./schema/auth";
