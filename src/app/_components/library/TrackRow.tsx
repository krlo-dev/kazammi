import type { ReactNode } from "react";

import { formatDuration, type TrackView } from "@/app/_lib/tracks";

import { Cover } from "../ui/Cover";
import { PreviewButton } from "../ui/PreviewButton";

/**
 * A track on a glass row: cover (with the play button of its 5 s sample), title, artist,
 * duration and optional actions.
 */
export function TrackRow({
  track,
  actions,
  as: Tag = "li",
}: {
  track: TrackView;
  actions?: ReactNode;
  as?: "li" | "div";
}) {
  return (
    <Tag className="glass flex min-h-[4.5rem] items-center gap-3.5 rounded-[1.25rem] p-2 pr-3 sm:gap-4">
      <div className="relative h-14 w-14 shrink-0 rounded-[0.875rem]">
        <Cover
          src={track.coverUrl}
          alt={`Portada de ${track.title}`}
          size={112}
          className="h-14 w-14 rounded-[0.875rem]"
        />
        {track.previewUrl && <PreviewButton url={track.previewUrl} title={track.title} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{track.title}</p>
        <p className="truncate text-sm text-fg-2">{track.artist}</p>
      </div>
      <span className="text-sm text-fg-2 tabular-nums">{formatDuration(track.durationSec)}</span>
      {actions}
    </Tag>
  );
}
