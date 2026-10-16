# 11 Library: diseño

## Esquema (`src/modules/db/schema/library.ts`)

```sql
CREATE TABLE saved_tracks (
  user_id  text    NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  track_id integer NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, track_id)
);
CREATE INDEX saved_tracks_recent_idx ON saved_tracks (user_id, saved_at DESC);

CREATE TABLE playlists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)                                  -- destino de la FK compuesta
);
CREATE UNIQUE INDEX playlists_user_name_idx ON playlists (user_id, lower(name));

CREATE TABLE playlist_tracks (
  playlist_id uuid    NOT NULL,
  user_id     text    NOT NULL,
  track_id    integer NOT NULL,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, track_id),
  FOREIGN KEY (playlist_id, user_id) REFERENCES playlists (id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id, track_id)    REFERENCES saved_tracks (user_id, track_id) ON DELETE CASCADE
);
```

**Por qué las FK compuestas** (ADR-11): `playlist_tracks.user_id` duplica el dueño a propósito.
- `(playlist_id, user_id) -> playlists(id, user_id)` garantiza que la fila pertenece al dueño de la playlist.
- `(user_id, track_id) -> saved_tracks` garantiza que la canción está en Guardadas de **ese** usuario, y el `ON DELETE CASCADE` implementa "quitar de Guardadas la quita de todas las playlists" sin código extra.

"Guardadas" no es una fila de `playlists`: es la vista de `saved_tracks`. El nombre queda reservado por validación en la capa de servicio.

## API pública (`src/modules/library/index.ts`)

```ts
export interface SavedTrack { track: Track; savedAt: Date }   // Track de @/modules/catalog
export interface PlaylistSummary { id: string; name: string; trackCount: number; coverTrackIds: number[] }
export interface PlaylistDetail extends PlaylistSummary { tracks: Array<{ track: Track; addedAt: Date }> }
export interface Page<T> { items: T[]; nextCursor: string | null }

export interface LibraryService {
  saveTrack(userId: string, trackId: number): Promise<void>;
  unsaveTrack(userId: string, trackId: number): Promise<void>;
  isSaved(userId: string, trackId: number): Promise<boolean>;
  listSaved(userId: string, opts: { limit: number; cursor?: string }): Promise<Page<SavedTrack>>;
  recentSaved(userId: string, limit?: number): Promise<SavedTrack[]>;

  listPlaylists(userId: string): Promise<PlaylistSummary[]>;
  getPlaylist(userId: string, playlistId: string): Promise<PlaylistDetail>;           // NotFoundError
  createPlaylist(userId: string, name: string): Promise<PlaylistSummary>;             // ValidationError
  renamePlaylist(userId: string, playlistId: string, name: string): Promise<void>;
  deletePlaylist(userId: string, playlistId: string): Promise<void>;
  addToPlaylist(userId: string, playlistId: string, trackId: number): Promise<void>;  // guarda también
  removeFromPlaylist(userId: string, playlistId: string, trackId: number): Promise<void>;
  playlistsForTrack(userId: string, trackId: number): Promise<Array<{ id: string; name: string; contains: boolean }>>;
}

export function createLibraryService(db: Database): LibraryService;
```

- Todas las consultas filtran por `user_id`. Si una consulta por `playlistId` + `userId` no devuelve filas, se lanza `NotFoundError` (LIB-R14).
- `addToPlaylist`: transacción con `INSERT INTO saved_tracks ... ON CONFLICT DO NOTHING` y luego `INSERT INTO playlist_tracks ... ON CONFLICT DO NOTHING`.
- Violaciones de FK por canción inexistente (`23503`) y de unicidad de nombre (`23505`) se traducen a `NotFoundError` y `ValidationError`.
- Cursor de `listSaved`: `saved_at` + `track_id` codificados en base64url.

## Server Actions (`src/app/(app)/_actions/library.ts`)

```ts
"use server";
export async function saveTrackAction(trackId: number): Promise<ActionResult>;
export async function unsaveTrackAction(trackId: number): Promise<ActionResult>;
export async function createPlaylistAction(name: string, addTrackId?: number): Promise<ActionResult<{ id: string }>>;
export async function renamePlaylistAction(playlistId: string, name: string): Promise<ActionResult>;
export async function deletePlaylistAction(playlistId: string): Promise<ActionResult>;
export async function addToPlaylistAction(playlistId: string, trackId: number): Promise<ActionResult>;
export async function removeFromPlaylistAction(playlistId: string, trackId: number): Promise<ActionResult>;

type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: "validation" | "not_found" | "limit" | "unknown"; message: string };
```

Cada acción: `requireUser()` -> validar con zod -> llamar al servicio -> `revalidatePath` de las rutas afectadas. El `userId` **siempre** sale de la sesión.

`createPlaylistAction(name, addTrackId)` permite "Nueva playlist" desde la hoja del resultado, creando y agregando en un paso.

## Lecturas

Las páginas `saved`, `playlists` y `playlists/[id]` son Server Components que llaman al servicio directamente. La hoja "Agregar a playlist" obtiene `playlistsForTrack` con una server action de lectura o un route handler `GET /api/library/playlists?trackId=` (se decide al implementar la UI).

## Archivos

| Archivo | Contenido |
|---|---|
| `src/modules/db/schema/library.ts` | Tablas y migración |
| `src/modules/library/saved.ts` | Guardadas |
| `src/modules/library/playlists.ts` | Playlists |
| `src/modules/library/index.ts` | `createLibraryService` y tipos |
| `src/modules/library/__tests__/library.int.test.ts` | Criterios de aceptación sobre PGlite |
| `src/app/(app)/_actions/library.ts` | Server actions |
