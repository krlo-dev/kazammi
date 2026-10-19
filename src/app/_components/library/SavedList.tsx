"use client";

import { BookmarkMinus, ListPlus, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { listSavedAction, unsaveTrackAction } from "@/app/(app)/_actions/library";
import type { TrackView } from "@/app/_lib/tracks";

import { ConfirmSheet } from "../ui/ConfirmSheet";
import { AddToPlaylistSheet } from "./AddToPlaylistSheet";
import { TrackRow } from "./TrackRow";

/** Guardadas with "Cargar más" (UI-R17): add to a playlist or unsave, with confirmation. */
export function SavedList({
  initial,
  initialCursor,
}: {
  initial: TrackView[];
  initialCursor: string | null;
}) {
  const [tracks, setTracks] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [adding, setAdding] = useState<TrackView | null>(null);
  const [removing, setRemoving] = useState<TrackView | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removePending, startRemove] = useTransition();
  const [lastAdding, setLastAdding] = useState<TrackView | null>(null);
  const [lastRemoving, setLastRemoving] = useState<TrackView | null>(null);

  // Keep the last track while a sheet closes, so its text does not vanish mid-animation.
  if (adding && adding !== lastAdding) setLastAdding(adding);
  if (removing && removing !== lastRemoving) setLastRemoving(removing);

  function loadMore() {
    if (!cursor) return;
    startLoading(async () => {
      const result = await listSavedAction(cursor);
      if (!result.ok) {
        setLoadError(result.message);
        return;
      }
      setLoadError(null);
      setTracks((current) => {
        const seen = new Set(current.map((t) => t.id));
        return [
          ...current,
          ...result.data.items.map((i) => i.track).filter((t) => !seen.has(t.id)),
        ];
      });
      setCursor(result.data.nextCursor);
    });
  }

  function confirmRemove() {
    const track = removing;
    if (!track) return;
    startRemove(async () => {
      const result = await unsaveTrackAction(track.id);
      if (!result.ok) {
        setRemoveError(result.message);
        return;
      }
      setTracks((current) => current.filter((t) => t.id !== track.id));
      setRemoving(null);
    });
  }

  return (
    <>
      {tracks.length === 0 && (
        <p className="glass rounded-[1.25rem] px-4 py-5 text-fg-2">
          Ya no tienes canciones guardadas. Identifica una y toca Guardar.
        </p>
      )}
      <ul className="flex flex-col gap-2.5">
        {tracks.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            actions={
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setAdding(track)}
                  aria-label={`Agregar ${track.title} a una playlist`}
                  className="btn-icon h-10 w-10"
                >
                  <ListPlus aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRemoveError(null);
                    setRemoving(track);
                  }}
                  aria-label={`Quitar ${track.title} de Guardadas`}
                  className="btn-icon h-10 w-10"
                >
                  <BookmarkMinus aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
              </div>
            }
          />
        ))}
      </ul>

      {cursor && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button type="button" onClick={loadMore} disabled={loading} className="btn-pill">
            {loading && <LoaderCircle aria-hidden className="h-[18px] w-[18px] animate-spin" />}
            {loading ? "Cargando…" : "Cargar más"}
          </button>
          {loadError && (
            <p role="alert" className="text-sm text-danger">
              {loadError}
            </p>
          )}
        </div>
      )}

      {lastAdding && (
        <AddToPlaylistSheet
          open={adding !== null}
          onClose={() => setAdding(null)}
          track={lastAdding}
        />
      )}
      <ConfirmSheet
        open={removing !== null}
        title="¿Quitar de Guardadas?"
        description={
          lastRemoving
            ? `“${lastRemoving.title}” también sale de todas tus playlists.`
            : "También sale de todas tus playlists."
        }
        confirmLabel="Quitar"
        pending={removePending}
        error={removeError}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}
