// Public API of the catalog module. Import this module only through this file.
import type { Database } from "@/modules/db";

import {
  findCandidates,
  insertTrackWithFingerprints,
  type TrackInsert,
} from "./fingerprint-repository";
import {
  existsBySha256,
  getCover,
  getStats,
  getTracksByIds,
  setFingerprintVersion,
} from "./track-repository";
import type { Candidate, CatalogStats, Cover, Track } from "./types";

export type { Candidate, CatalogStats, Cover, NewTrack, Track } from "./types";

export interface CatalogRepository {
  insertTrackWithFingerprints(input: TrackInsert): Promise<number>;
  existsBySha256(sha: string): Promise<boolean>;
  findCandidates(hashes: Uint32Array, times: Uint32Array, limit: number): Promise<Candidate[]>;
  getTracksByIds(ids: number[]): Promise<Track[]>;
  getCover(trackId: number): Promise<Cover | null>;
  getStats(): Promise<CatalogStats>;
  setFingerprintVersion(version: number): Promise<void>;
}

export function createCatalogRepository(db: Database): CatalogRepository {
  return {
    insertTrackWithFingerprints: (input) => insertTrackWithFingerprints(db, input),
    existsBySha256: (sha) => existsBySha256(db, sha),
    findCandidates: (hashes, times, limit) => findCandidates(db, hashes, times, limit),
    getTracksByIds: (ids) => getTracksByIds(db, ids),
    getCover: (trackId) => getCover(db, trackId),
    getStats: () => getStats(db),
    setFingerprintVersion: (version) => setFingerprintVersion(db, version),
  };
}
