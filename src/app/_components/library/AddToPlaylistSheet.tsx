"use client";

import { Check, ListPlus, LoaderCircle, Plus } from "lucide-react";
import { useEffect, useId, useState, useTransition, type FormEvent } from "react";

import {
  addToPlaylistAction,
  createPlaylistAction,
  playlistsForTrackAction,
  removeFromPlaylistAction,
} from "@/app/(app)/_actions/library";
import { PLAYLIST_NAME_MAX, playlistNameSchema } from "@/shared";

import { Sheet } from "../ui/Sheet";

type Row = { id: string; name: string; contains: boolean };
type Load =
  { status: "loading" } | { status: "error"; message: string } | { status: "ready"; rows: Row[] };

/**
 * "Agregar a playlist" (UI-R13): the user's playlists, checked when they already hold the
 * track, plus "Nueva playlist" that creates and adds in one step. Adding also saves the
 * track (LIB-R9), so `onSaved` lets the result update its Guardar button.
 */
export function AddToPlaylistSheet({
  open,
  onClose,
  track,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  track: { id: number; title: string };
  onSaved?: () => void;
}) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Reset when the sheet opens, then load (an async callback, not a synchronous set).
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoad({ status: "loading" });
      setNotice(null);
      setCreating(false);
    });
    playlistsForTrackAction(track.id).then((result) => {
      if (cancelled) return;
      setLoad(
        result.ok
          ? { status: "ready", rows: result.data }
          : { status: "error", message: result.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, track.id]);

  function toggle(row: Row) {
    setBusyId(row.id);
    startTransition(async () => {
      const result = row.contains
        ? await removeFromPlaylistAction(row.id, track.id)
        : await addToPlaylistAction(row.id, track.id);
      setBusyId(null);
      if (!result.ok) {
        setNotice({ tone: "error", text: result.message });
        return;
      }
      setLoad((current) =>
        current.status === "ready"
          ? {
              status: "ready",
              rows: current.rows.map((r) =>
                r.id === row.id ? { ...r, contains: !r.contains } : r,
              ),
            }
          : current,
      );
      setNotice({
        tone: "ok",
        text: row.contains ? `Quitada de ${row.name}.` : `Agregada a ${row.name}.`,
      });
      if (!row.contains) onSaved?.();
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Agregar a playlist"
      description={`“${track.title}” también queda en Guardadas.`}
    >
      {load.status === "loading" && (
        <p role="status" className="flex items-center gap-2 py-6 text-fg-2">
          <LoaderCircle aria-hidden className="h-5 w-5 animate-spin" /> Cargando tus playlists…
        </p>
      )}
      {load.status === "error" && (
        <p role="alert" className="py-4 text-danger">
          {load.message}
        </p>
      )}
      {load.status === "ready" && (
        <ul className="-mx-2 flex flex-col">
          {load.rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => toggle(row)}
                disabled={busyId !== null}
                aria-pressed={row.contains}
                className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 text-left transition-colors hover:bg-glass disabled:cursor-progress"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors ${
                    row.contains
                      ? "border-transparent bg-teal text-ink-0"
                      : "border-hairline bg-glass text-fg-2"
                  }`}
                >
                  {busyId === row.id ? (
                    <LoaderCircle aria-hidden className="h-5 w-5 animate-spin" />
                  ) : row.contains ? (
                    <Check aria-hidden className="h-5 w-5" strokeWidth={2.25} />
                  ) : (
                    <ListPlus aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="text-sm text-fg-3">{row.contains ? "Ya está" : "Agregar"}</span>
              </button>
            </li>
          ))}
          {load.rows.length === 0 && !creating && (
            <li className="px-2 pb-2 text-fg-2">Todavía no tienes playlists. Crea la primera.</li>
          )}
        </ul>
      )}

      {load.status === "ready" &&
        (creating ? (
          <NewPlaylistForm
            trackId={track.id}
            onCancel={() => setCreating(false)}
            onCreated={(name) => {
              setCreating(false);
              setNotice({ tone: "ok", text: `Creaste ${name} con esta canción.` });
              onSaved?.();
              playlistsForTrackAction(track.id).then((result) => {
                if (result.ok) setLoad({ status: "ready", rows: result.data });
              });
            }}
          />
        ) : (
          <button type="button" onClick={() => setCreating(true)} className="btn-pill mt-3">
            <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} /> Nueva playlist
          </button>
        ))}

      <p
        aria-live="polite"
        className={`min-h-6 pt-4 text-sm ${notice?.tone === "error" ? "text-danger" : "text-teal"}`}
      >
        {notice?.text}
      </p>
    </Sheet>
  );
}

/** Inline form: name with the shared rules, then createPlaylistAction(name, trackId). */
export function NewPlaylistForm({
  trackId,
  onCancel,
  onCreated,
  submitLabel = "Crear y agregar",
}: {
  trackId?: number;
  onCancel: () => void;
  onCreated: (name: string, id: string) => void;
  submitLabel?: string;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = String(new FormData(event.currentTarget).get("name") ?? "");
    const parsed = playlistNameSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    startTransition(async () => {
      const result = await createPlaylistAction(parsed.data, trackId);
      if (result.ok) onCreated(parsed.data, result.data.id);
      else setError(result.message);
    });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mt-3 rounded-2xl border border-hairline bg-glass p-3"
    >
      <label htmlFor={id} className="text-sm font-medium text-fg-2">
        Nombre de la playlist
      </label>
      <input
        id={id}
        name="name"
        autoFocus
        maxLength={PLAYLIST_NAME_MAX + 10}
        placeholder="Por ejemplo, Para entrenar"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onInput={() => error && setError(null)}
        className="mt-2 block min-h-12 w-full rounded-xl border border-hairline bg-ink-0/60 px-3.5 text-fg outline-none placeholder:text-fg-3 focus:border-teal/70"
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-pill">
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="btn-primary min-h-11 rounded-full px-5">
          {pending ? "Creando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
