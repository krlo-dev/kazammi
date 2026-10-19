import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { tracks } from "./catalog";

/** "Guardadas": the general playlist of every user. It is this table, not a playlists row. */
export const savedTracks = pgTable(
  "saved_tracks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    trackId: integer("track_id")
      .notNull()
      .references(() => tracks.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.trackId] }),
    index("saved_tracks_recent_idx").on(table.userId, table.savedAt.desc()),
  ],
);

export const playlists = pgTable(
  "playlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("playlists_name_length", sql`char_length(${table.name}) BETWEEN 1 AND 60`),
    // Target of the composite foreign key of playlist_tracks.
    unique("playlists_id_user_id_unique").on(table.id, table.userId),
    uniqueIndex("playlists_user_name_idx").on(table.userId, sql`lower(${table.name})`),
  ],
);

// user_id repeats the owner on purpose (ADR-11, specs/11-library/design.md): the composite
// foreign keys make the database enforce that a row belongs to the playlist owner and that
// the track is in that user's saved tracks. Unsaving a track cascades to every playlist.
export const playlistTracks = pgTable(
  "playlist_tracks",
  {
    playlistId: uuid("playlist_id").notNull(),
    userId: text("user_id").notNull(),
    trackId: integer("track_id").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.playlistId, table.trackId] }),
    foreignKey({
      name: "playlist_tracks_playlist_fk",
      columns: [table.playlistId, table.userId],
      foreignColumns: [playlists.id, playlists.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "playlist_tracks_saved_fk",
      columns: [table.userId, table.trackId],
      foreignColumns: [savedTracks.userId, savedTracks.trackId],
    }).onDelete("cascade"),
  ],
);
