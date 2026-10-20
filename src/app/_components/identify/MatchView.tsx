"use client";

import { ArrowLeft, Plus, Sigma } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";

import { formatDuration, metaLine } from "@/app/_lib/tracks";
import type { MatchResponse } from "@/shared";

import { AddToPlaylistSheet } from "../library/AddToPlaylistSheet";
import { SaveButton } from "../library/SaveButton";
import { Cover } from "../ui/Cover";
import { PreviewButton } from "../ui/PreviewButton";
import { useCoverColor } from "./use-cover-color";

const SPARKS = [
  { left: "6%", top: "18%", dx: "-10px", delay: "0s" },
  { left: "92%", top: "28%", dx: "12px", delay: "1.1s" },
  { left: "84%", top: "8%", dx: "6px", delay: "2.3s" },
  { left: "14%", top: "70%", dx: "-14px", delay: "3.2s" },
  { left: "96%", top: "64%", dx: "10px", delay: "4.1s" },
  { left: "48%", top: "-4%", dx: "-4px", delay: "1.7s" },
];

/** First word in white, the rest in lavender, like the reference's titles. */
function TwoTone({ text }: { text: string }) {
  const space = text.indexOf(" ");
  if (space < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, space)} <span className="text-fg-2">{text.slice(space + 1)}</span>
    </>
  );
}

/** The result of a match (UI-R11 to UI-R13, UI-R16). */
export function MatchView({ result, onAgain }: { result: MatchResponse; onAgain: () => void }) {
  const { track } = result;
  const [saved, setSaved] = useState(result.saved);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const halo = useCoverColor(track.coverUrl);
  const meta = metaLine(track);

  return (
    <section
      aria-labelledby="match-title"
      className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-x-14 gap-y-8 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:content-center lg:pt-0"
      style={{ "--halo": halo } as CSSProperties}
    >
      <div className="flex items-center justify-between lg:col-span-2">
        <button
          type="button"
          onClick={onAgain}
          aria-label="Volver a identificar"
          className="btn-icon"
        >
          <ArrowLeft aria-hidden className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="relative mx-auto w-[min(74vw,22rem)] lg:w-full lg:max-w-[26rem]">
        <div className="kz-id-cover">
          <div aria-hidden className="kz-id-halo" />
          <Cover
            src={track.coverUrl}
            alt={`Portada de ${track.title}`}
            size={640}
            priority
            className="aspect-square h-auto w-full rounded-[1.75rem] shadow-[0_30px_60px_-24px_rgb(0_0_0/0.85)]"
          />
          {SPARKS.map((spark) => (
            <span
              key={spark.left + spark.top}
              aria-hidden
              className="kz-id-spark"
              style={
                {
                  left: spark.left,
                  top: spark.top,
                  "--dx": spark.dx,
                  animationDelay: spark.delay,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>

      <div
        className={`kz-id-rise flex flex-col lg:justify-center`}
        style={{ animationDelay: "160ms" }}
      >
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <h1
              id="match-title"
              className="display text-[clamp(2.25rem,6.5vw,4rem)] [overflow-wrap:anywhere]"
            >
              <TwoTone text={track.title} />
            </h1>
            <p className="mt-2 text-lg text-fg">{track.artist}</p>
          </div>
          <SaveButton
            trackId={track.id}
            saved={saved}
            onSavedChange={setSaved}
            onError={setError}
          />
        </div>

        {meta && <p className="mt-4 text-fg-2">{meta}</p>}
        <p className="mt-1 text-fg-2">
          Empezaste a escuchar en{" "}
          <span className="font-medium text-fg tabular-nums">
            {formatDuration(result.offsetSeconds)}
          </span>{" "}
          · confianza{" "}
          <span className="font-medium text-fg tabular-nums">
            {Math.round(result.confidence * 100)}%
          </span>
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {track.previewUrl && (
            <PreviewButton url={track.previewUrl} title={track.title} variant="pill" />
          )}
          <button type="button" onClick={() => setSheetOpen(true)} className="btn-pill">
            <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
            Agregar a playlist
          </button>
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-sm text-danger">
          {error}
        </p>

        <div className="glass mt-6 flex flex-col gap-3 rounded-[1.5rem] p-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onAgain}
            className="btn-primary whitespace-nowrap sm:flex-1"
          >
            Identificar otra
          </button>
          <Link href="/how-it-works" className="btn-pill justify-center whitespace-nowrap">
            <Sigma aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Ver cómo se reconoció
          </Link>
        </div>
      </div>

      <AddToPlaylistSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        track={track}
        onSaved={() => setSaved(true)}
      />
    </section>
  );
}
