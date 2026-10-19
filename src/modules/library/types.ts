import type { Track } from "@/modules/catalog";

export interface SavedTrack {
  track: Track;
  savedAt: Date;
}

export interface PlaylistSummary {
  id: string;
  name: string;
  trackCount: number;
  /** Up to 4 tracks with a cover, in the order they were added, for the mosaic. */
  coverTrackIds: number[];
}

export interface PlaylistDetail extends PlaylistSummary {
  tracks: Array<{ track: Track; addedAt: Date }>;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
