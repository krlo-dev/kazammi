"use client";

import { ArrowLeft, ListMusic, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";

import {
  deletePlaylistAction,
  removeFromPlaylistAction,
  renamePlaylistAction,
} from "@/app/(app)/_actions/library";
import type { TrackView } from "@/app/_lib/tracks";
import { PLAYLIST_NAME_MAX, playlistNameSchema } from "@/shared";

import { ConfirmSheet } from "../ui/ConfirmSheet";
import { Sheet } from "../ui/Sheet";
import { StateMessage } from "../ui/StateMessage";
import { PageTitle } from "./PageTitle";
import { TrackRow } from "./TrackRow";

const songs = (n: number) => (n === 1 ? "1 canción" : `${n} canciones`);

/** /playlists/[id] (UI-R19): tracks, remove one, rename, delete with confirmation. */
export function PlaylistDetail({
  playlist,
}: {
  playlist: { id: string; name: string; tracks: TrackView[] };
}) {
  const router = useRouter();
  const [tracks, setTracks] = useState(playlist.tracks);
  const [name, setName] = useState(playlist.name);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busyTrack, setBusyTrack] = useState<number | null>(null);
  const [deletePending, startDelete] = useTransition();
  const [, startRemove] = useTransition();

  function remove(track: TrackView) {
    setBusyTrack(track.id);
    startRemove(async () => {
      const result = await removeFromPlaylistAction(playlist.id, track.id);
      setBusyTrack(null);
      if (!result.ok) {
        setRowError(result.message);
        return;
      }
      setRowError(null);
      setTracks((current) => current.filter((t) => t.id !== track.id));
    });
  }

  function confirmDelete() {
    startDelete(async () => {
      const result = await deletePlaylistAction(playlist.id);
      if (!result.ok) {
        setDeleteError(result.message);
        return;
      }
      router.replace("/playlists");
    });
  }

  const space = name.indexOf(" ");
  return (
    <>
      <Link href="/playlists" className="btn-pill mb-6 min-h-10 px-3.5 text-sm">
        <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        Mis playlists
      </Link>
      <PageTitle
        first={space < 0 ? name : name.slice(0, space)}
        second={space < 0 ? undefined : name.slice(space + 1)}
        lead={songs(tracks.length)}
        actions={
          <>
            <button type="button" onClick={() => setRenaming(true)} className="btn-pill">
              <Pencil aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Renombrar
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeleting(true);
              }}
              className="btn-pill btn-danger"
            >
              <Trash2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Borrar
            </button>
          </>
        }
      />

      {rowError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {rowError}
        </p>
      )}

      {tracks.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              actions={
                <button
                  type="button"
                  onClick={() => remove(track)}
                  disabled={busyTrack !== null}
                  aria-label={`Quitar ${track.title} de ${name}`}
                  className="btn-icon h-10 w-10 disabled:opacity-50"
                >
                  <X aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </button>
              }
            />
          ))}
        </ul>
      ) : (
        <div className="py-10">
          <StateMessage
            icon={ListMusic}
            title="Esta playlist está vacía"
            actions={
              <Link href="/" className="btn-primary rounded-full">
                Ir a Identificar
              </Link>
            }
          >
            <p>Identifica una canción y toca Agregar a playlist, o súmala desde Guardadas.</p>
          </StateMessage>
        </div>
      )}

      <Sheet open={renaming} onClose={() => setRenaming(false)} title="Renombrar playlist">
        {renaming && (
          <RenameForm
            playlistId={playlist.id}
            current={name}
            onCancel={() => setRenaming(false)}
            onRenamed={(value) => {
              setName(value);
              setRenaming(false);
            }}
          />
        )}
      </Sheet>
      <ConfirmSheet
        open={deleting}
        title={`¿Borrar ${name}?`}
        description="Las canciones siguen en Guardadas."
        confirmLabel="Borrar playlist"
        pending={deletePending}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(false)}
      />
    </>
  );
}

function RenameForm({
  playlistId,
  current,
  onCancel,
  onRenamed,
}: {
  playlistId: string;
  current: string;
  onCancel: () => void;
  onRenamed: (name: string) => void;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = playlistNameSchema.safeParse(
      String(new FormData(event.currentTarget).get("name") ?? ""),
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    startTransition(async () => {
      const result = await renamePlaylistAction(playlistId, parsed.data);
      if (result.ok) onRenamed(parsed.data);
      else setError(result.message);
    });
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor={id} className="text-sm font-medium text-fg-2">
        Nombre
      </label>
      <input
        id={id}
        name="name"
        defaultValue={current}
        autoFocus
        maxLength={PLAYLIST_NAME_MAX + 10}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onInput={() => error && setError(null)}
        className="mt-2 block min-h-12 w-full rounded-xl border border-hairline bg-ink-0/60 px-3.5 text-fg outline-none focus:border-teal/70"
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-pill">
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="btn-primary min-h-11 rounded-full px-5">
          {pending ? "Guardando…" : "Guardar nombre"}
        </button>
      </div>
    </form>
  );
}
