import { eq, sql } from "drizzle-orm";

import { trackCovers, tracks, type Database } from "@/modules/db";

import { rowsOf, toPgArray } from "./sql";
import type { Candidate, Cover, NewTrack } from "./types";

function assertSameLength(hashes: Uint32Array, anchorFrames: Uint32Array): void {
  if (hashes.length !== anchorFrames.length) {
    throw new RangeError(
      `hashes and anchorFrames must have the same length (${hashes.length} vs ${anchorFrames.length})`,
    );
  }
}

/** All fingerprints of one track in a single INSERT ... SELECT unnest(...). */
async function insertFingerprints(
  db: Database,
  trackId: number,
  hashes: Uint32Array,
  anchorFrames: Uint32Array,
): Promise<void> {
  if (hashes.length === 0) return;
  await db.execute(sql`
    INSERT INTO fingerprints (hash, track_id, anchor_frame)
    SELECT h, ${trackId}, t
    FROM unnest(${toPgArray(hashes)}::bigint[], ${toPgArray(anchorFrames)}::integer[]) AS u(h, t)
  `);
}

export interface TrackInsert {
  track: NewTrack;
  cover: Cover | null;
  hashes: Uint32Array;
  anchorFrames: Uint32Array;
  fingerprintVersion: number;
}

/**
 * Inserts the track, its cover and all its fingerprints in one transaction. The
 * fingerprints go in a single INSERT ... SELECT unnest(...): one round trip per song.
 */
export async function insertTrackWithFingerprints(
  db: Database,
  input: TrackInsert,
): Promise<number> {
  const { track, cover, hashes, anchorFrames, fingerprintVersion } = input;
  assertSameLength(hashes, anchorFrames);

  return db.transaction(async (tx) => {
    const [{ id }] = await tx
      .insert(tracks)
      .values({
        ...track,
        hasCover: cover !== null,
        fingerprintVersion,
        hashCount: hashes.length,
      })
      .returning({ id: tracks.id });

    if (cover) await tx.insert(trackCovers).values({ trackId: id, ...cover });
    await insertFingerprints(tx, id, hashes, anchorFrames);
    return id;
  });
}

export interface FingerprintReplace {
  trackId: number;
  hashes: Uint32Array;
  anchorFrames: Uint32Array;
  fingerprintVersion: number;
}

/**
 * Regenerates the fingerprints of an existing track (ingest --reset) and keeps its row,
 * so saved tracks and playlists that point to it survive.
 */
export async function replaceFingerprints(db: Database, input: FingerprintReplace): Promise<void> {
  const { trackId, hashes, anchorFrames, fingerprintVersion } = input;
  assertSameLength(hashes, anchorFrames);
  await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM fingerprints WHERE track_id = ${trackId}`);
    await insertFingerprints(tx, trackId, hashes, anchorFrames);
    await tx
      .update(tracks)
      .set({ fingerprintVersion, hashCount: hashes.length })
      .where(eq(tracks.id, trackId));
  });
}

/**
 * Offset histogram of one track for a query: [delta, count] for its `limit` most voted
 * offsets, sorted by delta. Feeds the explanatory view (debug mode of recognition).
 */
export async function getOffsetHistogram(
  db: Database,
  trackId: number,
  hashes: Uint32Array,
  times: Uint32Array,
  limit: number,
): Promise<[number, number][]> {
  if (hashes.length !== times.length) {
    throw new RangeError(
      `hashes and times must have the same length (${hashes.length} vs ${times.length})`,
    );
  }
  if (hashes.length === 0 || limit <= 0) return [];
  const rows = rowsOf<{ delta: number; count: number }>(
    await db.execute(sql`
      WITH q AS (
        SELECT * FROM unnest(${toPgArray(hashes)}::bigint[], ${toPgArray(times)}::integer[]) AS q(hash, t)
      ),
      top AS (
        SELECT f.anchor_frame - q.t AS delta, count(*)::int AS count
        FROM q JOIN fingerprints f ON f.hash = q.hash
        WHERE f.track_id = ${trackId}
        GROUP BY delta
        ORDER BY count DESC, delta
        LIMIT ${limit}
      )
      SELECT delta, count FROM top ORDER BY delta
    `),
  );
  return rows.map((row) => [row.delta, row.count]);
}

/** Removes every fingerprint and keeps tracks, covers and the users' library. */
export async function deleteAllFingerprints(db: Database): Promise<void> {
  await db.execute(sql`TRUNCATE fingerprints`);
}

/**
 * Refreshes the visibility map and planner statistics so lookups can use index-only
 * scans. VACUUM cannot run inside a transaction: call it on the root connection.
 */
export async function vacuumFingerprints(db: Database): Promise<void> {
  await db.execute(sql`VACUUM ANALYZE fingerprints`);
}

/**
 * Offset histogram in SQL: for every (track, anchor_frame - t) pair counts the matching
 * hashes, keeps the best offset of each track and returns the top `limit` tracks.
 * DISTINCT ON guarantees one row per track, so the runner-up is always another song.
 */
export async function findCandidates(
  db: Database,
  hashes: Uint32Array,
  times: Uint32Array,
  limit: number,
): Promise<Candidate[]> {
  if (hashes.length !== times.length) {
    throw new RangeError(
      `hashes and times must have the same length (${hashes.length} vs ${times.length})`,
    );
  }
  if (hashes.length === 0 || limit <= 0) return [];

  return rowsOf<Candidate>(
    await db.execute(sql`
      WITH q AS (
        SELECT * FROM unnest(${toPgArray(hashes)}::bigint[], ${toPgArray(times)}::integer[]) AS q(hash, t)
      ),
      agg AS (
        SELECT f.track_id, f.anchor_frame - q.t AS delta, count(*) AS c
        FROM q JOIN fingerprints f ON f.hash = q.hash
        GROUP BY f.track_id, delta
      ),
      best AS (
        SELECT DISTINCT ON (track_id) track_id, delta, c
        FROM agg
        ORDER BY track_id, c DESC, delta
      )
      SELECT track_id AS "trackId", delta, c::int AS count
      FROM best
      ORDER BY c DESC, track_id
      LIMIT ${limit}
    `),
  );
}
