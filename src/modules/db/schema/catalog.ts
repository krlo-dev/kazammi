import {
  bigint,
  boolean,
  customType,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({
  dataType: () => "bytea",
  // postgres.js returns Buffer and PGlite returns Uint8Array: normalize to Uint8Array.
  fromDriver: (value) => new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
});

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  /** Path relative to data/songs. */
  sourcePath: text("source_path").notNull(),
  /** SHA-256 of the source file: makes ingestion idempotent. */
  contentSha256: text("content_sha256").notNull().unique(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  genre: text("genre"),
  year: integer("year"),
  durationSec: real("duration_sec").notNull(),
  hasCover: boolean("has_cover").notNull().default(false),
  fingerprintVersion: integer("fingerprint_version").notNull(),
  hashCount: integer("hash_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trackCovers = pgTable("track_covers", {
  trackId: integer("track_id")
    .primaryKey()
    .references(() => tracks.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
});

// No primary key and no index by track_id on purpose (see specs/04-catalog/design.md).
// The covering index fingerprints_hash_idx (hash) INCLUDE (track_id, anchor_frame) lives
// in a custom SQL migration because Drizzle's index builder has no INCLUDE clause.
export const fingerprints = pgTable("fingerprints", {
  // uint32 does not fit a signed integer column; every uint32 fits a JS number.
  hash: bigint("hash", { mode: "number" }).notNull(),
  trackId: integer("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  anchorFrame: integer("anchor_frame").notNull(),
});

export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
