# 04 DB y Catalog: tareas

- [ ] **T0. Proyecto en Neon (manual, Krlo)**
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
  - Estado: migraciones verificadas en PGlite. Falta correr `npm run db:migrate` contra `dev` cuando exista T0.
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
  - Nota: la validación de sesión (`requireUserForApi()`) se agrega en `10-auth` T5; la ruta tiene un `TODO(10-auth)`.

- [ ] **T7. Verificación del plan en Neon**
  - Después de la primera ingesta (`05-ingestion`): `VACUUM ANALYZE` y `EXPLAIN ANALYZE`; anotar el resultado abajo.
  - Sin commit, salvo ajustes.

## Resultados medidos

| Medida | Valor |
|---|---|
| Plan de la consulta en Neon | pendiente |
| Tiempo de la consulta (3.000 hashes) | pendiente |
| Tamaño de `fingerprints` | pendiente |
