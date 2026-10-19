"use client";

import { Bookmark } from "lucide-react";
import { useOptimistic, useTransition } from "react";

import { saveTrackAction, unsaveTrackAction } from "@/app/(app)/_actions/library";

/**
 * The big round white button of the result (UI-R12): toggles the track in Guardadas with
 * an optimistic update. Controlled, so adding to a playlist can also mark it as saved.
 */
export function SaveButton({
  trackId,
  saved,
  onSavedChange,
  onError,
}: {
  trackId: number;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
  onError: (message: string) => void;
}) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const result = next ? await saveTrackAction(trackId) : await unsaveTrackAction(trackId);
      if (result.ok) onSavedChange(next);
      else onError(result.message);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={optimistic}
      aria-label={optimistic ? "Quitar de Guardadas" : "Guardar en Guardadas"}
      aria-busy={pending || undefined}
      className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-action-ink shadow-[0_14px_34px_-12px_rgb(255_255_255/0.55)] transition-transform duration-200 ease-[var(--ease-out-quart)] hover:scale-[1.04] active:scale-95"
    >
      <Bookmark
        aria-hidden
        className="h-6 w-6 transition-[fill] duration-200"
        strokeWidth={2}
        fill={optimistic ? "currentColor" : "none"}
      />
    </button>
  );
}
