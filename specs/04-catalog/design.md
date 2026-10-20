# 04 DB y Catalog: diseño

## Módulo `db`

```
src/modules/db/
├── index.ts           # getDb(), tipo Database, re-exporta el esquema
├── client.ts          # postgres.js + drizzle, singleton
├── testing.ts         # createTestDb(): PGlite + migraciones (solo tests)
└── schema/
    ├── catalog.ts     # tracks, track_covers, fingerprints, app_meta
    ├── auth.ts        # user, session, account, verification (generado por Better Auth, ver 10-auth)
    └── library.ts     # saved_tracks, playlists, playlist_tracks (ver 11-library)
```

- `client.ts`: `postgres(DATABASE_URL, { prepare: false, max: 1 })`. `prepare: false` es necesario con el endpoint *pooled* de Neon (PgBouncer en modo transacción); `max: 1` porque cada instancia serverless atiende una petición a la vez.
- `testing.ts` lo pueden importar los archivos de `__tests__/` de cualquier módulo (excepción configurada en ESLint).
- Los repositorios usan el tipo común `PgDatabase` de Drizzle, así el mismo código corre con postgres.js y con PGlite.

## Esquema del catálogo

```sql
CREATE TABLE tracks (
  id                  serial PRIMARY KEY,
  source_path         text NOT NULL,             -- ruta relativa dentro de data/songs
  content_sha256      text NOT NULL UNIQUE,      -- idempotencia de la ingesta
  title               text NOT NULL,
  artist              text NOT NULL,
  album               text,
  genre               text,
  year                integer,
  duration_sec        real NOT NULL,
  has_cover           boolean NOT NULL DEFAULT false,
  fingerprint_version integer NOT NULL,
  hash_count          integer NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE track_covers (
  track_id integer PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  mime     text NOT NULL,
  data     bytea NOT NULL
);

-- Muestra de 5 s (CAT-R9, migración 0004): la escribe la ingesta, la sirve /api/tracks/[id]/preview.
CREATE TABLE track_previews (
  track_id  integer PRIMARY KEY REFERENCES tracks(id) ON DELETE CASCADE,
  mime      text NOT NULL,      -- audio/mpeg
  start_sec real NOT NULL,      -- dónde empieza en la canción
  data      bytea NOT NULL      -- ~80 KB (5 s a 128 kb/s)
);
-- tracks.has_preview boolean NOT NULL DEFAULT false

CREATE TABLE fingerprints (
  hash         bigint  NOT NULL,                 -- uint32 no cabe en integer con signo
  track_id     integer NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  anchor_frame integer NOT NULL
);

CREATE INDEX fingerprints_hash_idx ON fingerprints (hash) INCLUDE (track_id, anchor_frame);

CREATE TABLE app_meta (
  key   text PRIMARY KEY,
  value text NOT NULL
);  -- ('fingerprint_version', '1')
```

- Las tablas se definen con Drizzle. El índice con `INCLUDE` se crea en una **migración SQL personalizada** (`drizzle-kit generate --custom`) si el DSL de Drizzle no lo soporta.
- Sin clave primaria en `fingerprints`: no se necesita y ahorra espacio. Sin índice por `track_id`: borrar una canción es raro y el catálogo es pequeño.
- Después de cada ingesta: `VACUUM ANALYZE fingerprints` para que el *visibility map* permita index-only scans.

## Consulta de matching

```sql
WITH q AS (
  SELECT * FROM unnest($1::bigint[], $2::integer[]) AS q(hash, t)
),
agg AS (
  SELECT f.track_id, f.anchor_frame - q.t AS delta, count(*) AS c
  FROM q JOIN fingerprints f ON f.hash = q.hash
  GROUP BY f.track_id, delta
),
smoothed AS (
  SELECT track_id, delta, c,
    sum(c) OVER (PARTITION BY track_id ORDER BY delta RANGE BETWEEN 1 PRECEDING AND 1 FOLLOWING) AS score
  FROM agg
),
best AS (
  SELECT DISTINCT ON (track_id) track_id, delta, score
  FROM smoothed
  ORDER BY track_id, score DESC, c DESC, delta
)
SELECT track_id AS "trackId", delta, score::int AS count
FROM best
ORDER BY score DESC, track_id
LIMIT $3;
```

- `smoothed` (T8) puntúa cada desfase con sus votos más los de `delta - 1` y `delta + 1`. La consulta empieza en cualquier muestra, así que su rejilla de frames queda hasta medio hop corrida respecto a la indexada y los votos de una misma alineación se reparten entre dos desfases vecinos.
- `DISTINCT ON` deja el mejor desfase de cada canción, así el segundo resultado es siempre **otra** canción (necesario para la razón score₁/score₂).
- **Verificado** en PostgreSQL 16 con 4 M filas y 3.100 hashes de consulta: plan `Nested Loop` + `Index Only Scan using fingerprints_hash_idx`, `Heap Fetches: 0`, ~35 ms; devuelve la canción y el desfase correctos. Tamaño medido: ~72 B por fila con índice.
- **Medido en Neon** (PostgreSQL 18, rama `dev`, 7 canciones reales): mismo plan con `Heap Fetches: 0`, pero ~85 B por fila y ~410 ms, porque cada hash de la consulta coincide con ~400 filas (ver `tasks.md`, resultados).

## Inserción de una canción

```sql
BEGIN;
INSERT INTO tracks (...) VALUES (...) RETURNING id;
INSERT INTO track_covers (track_id, mime, data) VALUES ($id, 'image/webp', $bytes);   -- si hay portada
INSERT INTO fingerprints (hash, track_id, anchor_frame)
  SELECT h, $id, t FROM unnest($hashes::bigint[], $frames::integer[]) AS u(h, t);
COMMIT;
```

Una sola sentencia para ~45.000 fingerprints: un viaje de red a Neon por canción.

## API pública (`src/modules/catalog/index.ts`)

```ts
export interface Track {
  id: number; title: string; artist: string; album: string | null;
  genre: string | null; year: number | null; durationSec: number; hasCover: boolean;
}

export interface Candidate { trackId: number; delta: number; count: number }

export interface NewTrack extends Omit<Track, "id" | "hasCover"> {
  sourcePath: string; contentSha256: string;
}

export interface CatalogRepository {
  insertTrackWithFingerprints(input: {
    track: NewTrack;
    cover: { mime: string; data: Uint8Array } | null;
    hashes: Uint32Array;
    anchorFrames: Uint32Array;
    fingerprintVersion: number;
  }): Promise<number>;
  findTrackIdBySha256(sha: string): Promise<number | null>;   // idempotencia de la ingesta
  /** --reset de la ingesta: regenera los fingerprints y conserva la fila de tracks. */
  replaceFingerprints(input: {
    trackId: number; hashes: Uint32Array; anchorFrames: Uint32Array; fingerprintVersion: number;
  }): Promise<void>;
  deleteAllFingerprints(): Promise<void>;                        // TRUNCATE fingerprints
  vacuumFingerprints(): Promise<void>;                           // VACUUM ANALYZE (fuera de transacción)
  findCandidates(hashes: Uint32Array, times: Uint32Array, limit: number): Promise<Candidate[]>;
  getTracksByIds(ids: number[]): Promise<Track[]>;
  getCover(trackId: number): Promise<{ mime: string; data: Uint8Array } | null>;
  getPreview(trackId: number): Promise<{ mime: string; startSec: number; data: Uint8Array } | null>;
  setPreview(trackId: number, preview: Preview): Promise<void>; // upsert + has_preview = true
  getStats(): Promise<{ tracks: number; fingerprints: number; fingerprintVersion: number | null; tableBytes: number }>;
  setFingerprintVersion(version: number): Promise<void>;
}

export function createCatalogRepository(db: Database): CatalogRepository;
```

## Archivos de `catalog`

| Archivo | Contenido |
|---|---|
| `track-repository.ts` | Canciones, portadas, estadísticas |
| `fingerprint-repository.ts` | Inserción con `unnest` y consulta de matching |
| `index.ts` | `createCatalogRepository` y tipos |
| `__tests__/catalog.int.test.ts` | Integración con PGlite |
| `src/app/api/tracks/[id]/cover/route.ts` | Sirve la portada (exige sesión) |
| `src/app/api/tracks/[id]/preview/route.ts` | Sirve la muestra de 5 s (exige sesión) |

## Notas de implementación

- `db.execute()` devuelve un arreglo de filas en postgres.js y `{ rows }` en PGlite; `catalog/sql.ts` expone `rowsOf()` para leer ambos.
- `bytea` se define con `customType` de Drizzle y siempre devuelve `Uint8Array` (postgres.js entrega `Buffer`).
- `drizzle.config.ts` carga `.env.local` por su cuenta, porque `drizzle-kit` no lo lee. Scripts: `npm run db:generate` y `npm run db:migrate`.
- ESLint permite importar `@/modules/db/testing` solo desde archivos dentro de `__tests__/`.
- El `DISTINCT ON` desempata por `delta` y el orden final por `track_id`, para que el resultado sea determinista.

## Riesgos

- **Hashes muy frecuentes**: algunos hashes aparecen en muchas canciones y generan filas de más. Con un catálogo de decenas de canciones no es un problema; si lo fuera, se excluyen los hashes más comunes.
- **Arreglos como parámetros**: resuelto. Los arreglos se envían como un único parámetro de texto con un literal de arreglo (`'{1,2,3}'`) y se convierten en SQL (`::bigint[]`). Funciona igual en postgres.js y en PGlite y cuesta un solo bind aunque haya 45.000 valores (`catalog/sql.ts`).
