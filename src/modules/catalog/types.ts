export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  year: number | null;
  durationSec: number;
  hasCover: boolean;
  hasPreview: boolean;
}

export interface Candidate {
  trackId: number;
  delta: number;
  count: number;
}

export interface NewTrack extends Omit<Track, "id" | "hasCover" | "hasPreview"> {
  sourcePath: string;
  contentSha256: string;
}

export interface Cover {
  mime: string;
  data: Uint8Array;
}

/** Short audio sample of a track (an MP3 of the loudest 5 s, see specs/05-ingestion). */
export interface Preview {
  mime: string;
  startSec: number;
  data: Uint8Array;
}

export interface CatalogStats {
  tracks: number;
  fingerprints: number;
  fingerprintVersion: number | null;
  tableBytes: number;
}
