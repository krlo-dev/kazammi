import type { RecognizedTrack } from "@/shared";

/** What the UI needs of a track. Serializable, so it crosses from Server to Client Components. */
export type TrackView = RecognizedTrack;

/** Catalog or library track -> TrackView, with the cover route when it has one. */
export function toTrackView(track: Omit<TrackView, "coverUrl"> & { hasCover: boolean }): TrackView {
  const { hasCover, ...rest } = track;
  return { ...rest, coverUrl: hasCover ? `/api/tracks/${track.id}/cover` : null };
}

/** 213.4 -> "3:33". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

/** "Álbum · 2013 · Electrónica", skipping what the catalog does not know. */
export function metaLine(track: Pick<TrackView, "album" | "year" | "genre">): string {
  return [track.album, track.year, track.genre].filter(Boolean).join(" · ");
}
