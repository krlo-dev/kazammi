import { sql } from "drizzle-orm";

import { trackCovers, tracks, type Database } from "@/modules/db";

import { rowsOf, toPgArray } from "./sql";
import type { Candidate, Cover, NewTrack } from "./types";

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
  if (hashes.length !== anchorFrames.length) {
    throw new RangeError(
      `hashes and anchorFrames must have the same length (${hashes.length} vs ${anchorFrames.length})`,
    );
  }

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

    if (hashes.length > 0) {
      await tx.execute(sql`
        INSERT INTO fingerprints (hash, track_id, anchor_frame)
        SELECT h, ${id}, t
        FROM unnest(${toPgArray(hashes)}::bigint[], ${toPgArray(anchorFrames)}::integer[]) AS u(h, t)
      `);
    }
    return id;
  });
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
