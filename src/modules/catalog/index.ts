// Public API of the catalog module. Import this module only through this file.
import type { Database } from "@/modules/db";

import {
  deleteAllFingerprints,
  findCandidates,
  getOffsetHistogram,
  insertTrackWithFingerprints,
  replaceFingerprints,
  vacuumFingerprints,
  type FingerprintReplace,
  type TrackInsert,
} from "./fingerprint-repository";
import {
  findTrackIdBySha256,
  getCover,
  getPreview,
  getStats,
  getTracksByIds,
  setFingerprintVersion,
  setPreview,
} from "./track-repository";
import type { Candidate, CatalogStats, Cover, Preview, Track } from "./types";

export type { FingerprintReplace, TrackInsert } from "./fingerprint-repository";
export type { Candidate, CatalogStats, Cover, NewTrack, Preview, Track } from "./types";

export interface CatalogRepository {
  insertTrackWithFingerprints(input: TrackInsert): Promise<number>;
  findTrackIdBySha256(sha: string): Promise<number | null>;
  replaceFingerprints(input: FingerprintReplace): Promise<void>;
  deleteAllFingerprints(): Promise<void>;
  vacuumFingerprints(): Promise<void>;
  findCandidates(hashes: Uint32Array, times: Uint32Array, limit: number): Promise<Candidate[]>;
  getOffsetHistogram(
    trackId: number,
    hashes: Uint32Array,
    times: Uint32Array,
    limit: number,
  ): Promise<[number, number][]>;
  getTracksByIds(ids: number[]): Promise<Track[]>;
  getCover(trackId: number): Promise<Cover | null>;
  getPreview(trackId: number): Promise<Preview | null>;
  setPreview(trackId: number, preview: Preview): Promise<void>;
  getStats(): Promise<CatalogStats>;
  setFingerprintVersion(version: number): Promise<void>;
}

export function createCatalogRepository(db: Database): CatalogRepository {
  return {
    insertTrackWithFingerprints: (input) => insertTrackWithFingerprints(db, input),
    findTrackIdBySha256: (sha) => findTrackIdBySha256(db, sha),
    replaceFingerprints: (input) => replaceFingerprints(db, input),
    deleteAllFingerprints: () => deleteAllFingerprints(db),
    vacuumFingerprints: () => vacuumFingerprints(db),
    findCandidates: (hashes, times, limit) => findCandidates(db, hashes, times, limit),
    getOffsetHistogram: (trackId, hashes, times, limit) =>
      getOffsetHistogram(db, trackId, hashes, times, limit),
    getTracksByIds: (ids) => getTracksByIds(db, ids),
    getCover: (trackId) => getCover(db, trackId),
    getPreview: (trackId) => getPreview(db, trackId),
    setPreview: (trackId, preview) => setPreview(db, trackId, preview),
    getStats: () => getStats(db),
    setFingerprintVersion: (version) => setFingerprintVersion(db, version),
  };
}
