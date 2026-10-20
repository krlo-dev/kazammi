"use client";

import { LoaderCircle, Play, Square } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import {
  getServerSnapshot,
  getSnapshot,
  stopPreview,
  subscribe,
  togglePreview,
} from "./preview-player";

/**
 * Plays the 5 s sample of a track (the loudest stretch, see specs/05-ingestion). `overlay`
 * sits on a row's cover; `pill` is the labeled button of the result. While playing, a ring
 * fills over the 5 s of the sample.
 */
export function PreviewButton({
  url,
  title,
  variant = "overlay",
}: {
  url: string;
  title: string;
  variant?: "overlay" | "pill";
}) {
  const { url: current, status } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mine = current === url ? status : "idle";

  // Leaving the screen (or Next hiding it) stops this track's sample.
  useEffect(
    () => () => {
      if (getSnapshot().url === url) stopPreview();
    },
    [url],
  );

  const label =
    mine === "idle" ? `Escuchar una muestra de ${title}` : `Detener la muestra de ${title}`;
  const icon =
    mine === "loading" ? (
      <LoaderCircle aria-hidden className="h-[18px] w-[18px] animate-spin" strokeWidth={2} />
    ) : mine === "playing" ? (
      <Square aria-hidden className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
    ) : (
      <Play
        aria-hidden
        className="h-[18px] w-[18px] translate-x-px"
        fill="currentColor"
        strokeWidth={0}
      />
    );

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={() => togglePreview(url)}
        aria-label={label}
        aria-pressed={mine !== "idle"}
        className="btn-pill"
      >
        <span className="relative grid h-[18px] w-[18px] place-items-center">
          {icon}
          {mine === "playing" && <ProgressRing />}
        </span>
        {mine === "idle" ? "Escuchar muestra" : "Detener"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => togglePreview(url)}
      aria-label={label}
      aria-pressed={mine !== "idle"}
      // With a mouse the play button only shows on hover or keyboard focus; touch screens have
      // no hover, so there it stays visible.
      className={`group absolute inset-0 grid place-items-center rounded-[inherit] text-white transition-[background-color,opacity] focus-visible:outline-offset-[-2px] ${
        mine === "idle"
          ? "bg-black/15 hover:bg-black/45 [@media(hover:hover)]:bg-black/45 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
          : "bg-black/55"
      }`}
    >
      <span className="relative grid h-8 w-8 place-items-center rounded-full bg-black/45 backdrop-blur-sm transition-transform group-hover:scale-110">
        {icon}
        {mine === "playing" && <ProgressRing />}
      </span>
    </button>
  );
}

/** A ring that fills over the 5 s of the sample (a static full ring with reduced motion). */
function ProgressRing() {
  return (
    <svg aria-hidden viewBox="0 0 36 36" className="absolute -inset-1.5 -rotate-90">
      <circle cx="18" cy="18" r="16" fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="2" />
      <circle
        cx="18"
        cy="18"
        r="16"
        fill="none"
        stroke="var(--color-teal)"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        className="kz-preview-progress"
      />
    </svg>
  );
}
