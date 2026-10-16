// Public API of the db module. Import this module only through this file
// (tests may also use ./testing). Server and Node scripts only.
export { getDb, type Database } from "./client";
export * from "./schema";
