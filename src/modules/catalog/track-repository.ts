import { eq, inArray, sql } from "drizzle-orm";

import { appMeta, trackCovers, tracks, type Database } from "@/modules/db";

import { rowsOf } from "./sql";
import type { CatalogStats, Cover, Track } from "./types";

const FINGERPRINT_VERSION_KEY = "fingerprint_version";

const trackColumns = {
  id: tracks.id,
  title: tracks.title,
  artist: tracks.artist,
  album: tracks.album,
  genre: tracks.genre,
  year: tracks.year,
  durationSec: tracks.durationSec,
  hasCover: tracks.hasCover,
};

/** Id of the track ingested from a file with this SHA-256, or null if there is none. */
export async function findTrackIdBySha256(db: Database, sha: string): Promise<number | null> {
  const rows = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.contentSha256, sha))
    .limit(1);
  return rows[0]?.id ?? null;
}

/** Tracks in the same order as `ids`; unknown ids are skipped. */
export async function getTracksByIds(db: Database, ids: number[]): Promise<Track[]> {
  if (ids.length === 0) return [];
  const rows = await db.select(trackColumns).from(tracks).where(inArray(tracks.id, ids));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

export async function getCover(db: Database, trackId: number): Promise<Cover | null> {
  const rows = await db
    .select({ mime: trackCovers.mime, data: trackCovers.data })
    .from(trackCovers)
    .where(eq(trackCovers.trackId, trackId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getStats(db: Database): Promise<CatalogStats> {
  const [row] = rowsOf<{ tracks: number; fingerprints: number; table_bytes: string | number }>(
    await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM tracks) AS tracks,
        (SELECT count(*)::int FROM fingerprints) AS fingerprints,
        pg_total_relation_size('fingerprints') AS table_bytes
    `),
  );
  const meta = await db
    .select({ value: appMeta.value })
    .from(appMeta)
    .where(eq(appMeta.key, FINGERPRINT_VERSION_KEY));
  return {
    tracks: row.tracks,
    fingerprints: row.fingerprints,
    fingerprintVersion: meta[0] ? Number(meta[0].value) : null,
    tableBytes: Number(row.table_bytes),
  };
}

export async function setFingerprintVersion(db: Database, version: number): Promise<void> {
  await db
    .insert(appMeta)
    .values({ key: FINGERPRINT_VERSION_KEY, value: String(version) })
    .onConflictDoUpdate({ target: appMeta.key, set: { value: String(version) } });
}
