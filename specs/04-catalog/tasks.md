# 04 DB y Catalog: tareas

- [x] **T0. Proyecto en Neon (manual, Krlo)**
  - Crear el proyecto `kazammi` en Neon (región cercana a la de Vercel, p. ej. `us-east-1`).
  - Crear la rama `dev` desde `main`. Copiar la cadena *pooled* de `dev` a `.env.local`.
  - Sin commit.

- [x] **T1. Cliente y tipo `Database`**
  - Cubre: DB-R1, DB-R4.
  - Dependencias: `drizzle-orm`, `postgres`, `drizzle-kit` (dev).
  - Commit: `feat(db): add drizzle client for neon with postgres.js`

- [x] **T2. Esquema del catálogo y migraciones**
  - Cubre: DB-R2, CAT-R1, CAT-R2, CAT-R3, CAT-R8.
  - Verifica: `npm run db:migrate` crea las tablas e índice en la rama `dev`.
  - Estado: verificado. `npm run db:migrate` aplicado en la rama `dev` (PostgreSQL 18.6): 4 tablas y `fingerprints_hash_idx` con `INCLUDE`. La conexión puede venir de `.env.local` o de `.env`.
  - Commit: `feat(db): add drizzle schema and migrations for neon`

- [x] **T3. Base de pruebas con PGlite**
  - Cubre: DB-R3.
  - Dependencias: `@electric-sql/pglite` (dev).
  - Commit: `test(db): add in-memory pglite database for tests`

- [x] **T4. Repositorio de canciones y portadas**
  - Cubre: CAT-R1, CAT-R3, CAT-R6, CAT-R7.
  - Commit: `feat(catalog): add track and cover repository`

- [x] **T5. Inserción de fingerprints y consulta de matching**
  - Cubre: CAT-R4, CAT-R5.
  - Verifica: test de integración en PGlite.
  - Commit: `feat(catalog): add sql offset histogram candidate query`

- [x] **T6. Ruta de portadas**
  - Cubre: CAT-R3.
  - Commit: `feat(catalog): serve track covers with immutable caching`
  - Nota: desde `10-auth` T5 la ruta exige sesión con `withApiAuth` (401 sin sesión).

- [x] **T7. Verificación del plan en Neon**
  - Después de la primera ingesta (`05-ingestion`): `VACUUM ANALYZE` y `EXPLAIN ANALYZE`; anotar el resultado abajo.
  - Sin commit, salvo ajustes.

- [x] **T8. Desfase con tolerancia de ±1 frame**
  - Cubre: CAT-R5.
  - Origen: pruebas con micrófono real (`06-recognition` T11). La ventana `RANGE BETWEEN 1 PRECEDING AND 1 FOLLOWING` suma los votos de los desfases vecinos antes de elegir el mejor de cada canción.
  - Verifica: test de integración con los votos repartidos entre los desfases 40 y 41 (cuentan 40, no 20); latencia en Neon sin cambios (p95 425 ms con 12 s).
  - Commit: `perf(catalog): score offsets with the votes of their neighbors`

- [x] **T9. Muestra de audio por canción**
  - Cubre: CAT-R9.
  - Tabla `track_previews` y columna `tracks.has_preview` (migración `0004_track_previews`), `getPreview` y `setPreview` en el repositorio y la ruta `GET /api/tracks/[id]/preview`.
  - Verifica: test de integración del repositorio y test de la ruta en PGlite (401, 404, 400 e `audio/mpeg` con caché inmutable).
  - Commit: ver `05-ingestion` T8 (un solo commit para la muestra).

## Resultados medidos

| Medida | Valor |
|---|---|
| Plan de la consulta en Neon | `Nested Loop` + `Index Only Scan using fingerprints_hash_idx`, `Heap Fetches: 0` (tras `VACUUM ANALYZE`), 9.932 buffers en caché |
| Tiempo de la consulta (1.956 hashes, clip de 10 s) | 409 ms en el servidor (~530 ms con red). 787.000 filas unidas: ~400 coincidencias por hash |
| Tamaño de `fingerprints` | 47,5 MB para 584.673 filas (7 canciones): ~85 B por fila con índice |
