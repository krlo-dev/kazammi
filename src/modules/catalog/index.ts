// Public API of the catalog module. Import this module only through this file.
import type { Database } from "@/modules/db";

import {
  deleteAllFingerprints,
  findCandidates,
  insertTrackWithFingerprints,
  replaceFingerprints,
  vacuumFingerprints,
  type FingerprintReplace,
  type TrackInsert,
} from "./fingerprint-repository";
import {
  findTrackIdBySha256,
  getCover,
  getStats,
  getTracksByIds,
  setFingerprintVersion,
} from "./track-repository";
import type { Candidate, CatalogStats, Cover, Track } from "./types";

export type { FingerprintReplace, TrackInsert } from "./fingerprint-repository";
export type { Candidate, CatalogStats, Cover, NewTrack, Track } from "./types";

export interface CatalogRepository {
  insertTrackWithFingerprints(input: TrackInsert): Promise<number>;
  findTrackIdBySha256(sha: string): Promise<number | null>;
  replaceFingerprints(input: FingerprintReplace): Promise<void>;
  deleteAllFingerprints(): Promise<void>;
  vacuumFingerprints(): Promise<void>;
  findCandidates(hashes: Uint32Array, times: Uint32Array, limit: number): Promise<Candidate[]>;
  getTracksByIds(ids: number[]): Promise<Track[]>;
  getCover(trackId: number): Promise<Cover | null>;
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
    getTracksByIds: (ids) => getTracksByIds(db, ids),
    getCover: (trackId) => getCover(db, trackId),
    getStats: () => getStats(db),
    setFingerprintVersion: (version) => setFingerprintVersion(db, version),
  };
}
