# 09 Deploy: tareas

- [ ] **T1. Proyecto en Vercel (manual, Krlo)**
  - Cubre: DEP-R1, DEP-R2.
  - Sin commit.

- [ ] **T2. Neon `main`, migraciones y catálogo (manual, Krlo)**
  - Cubre: DEP-R3.
  - `npm run db:migrate` y `npm run ingest` apuntando a `main`.
  - Sin commit.

- [ ] **T3. Variables de entorno de producción (manual, Krlo)**
  - Cubre: DEP-R4, DEP-R6.
  - Sin commit.

- [ ] **T4. Región y runtime**
  - Cubre: DEP-R5.
  - Commit: `build(deploy): configure vercel and neon for production`

- [ ] **T5. Previews con rama de Neon y login** (S)
  - Cubre: DEP-R7, DEP-R8.
  - Commit: `build(deploy): support auth and neon branches on preview deployments`

- [ ] **T6. Verificación en producción**
  - Cubre: DEP-R9 y criterios V-1, V-2, V-3, V-6. Anotar resultados abajo.
  - Commit: `docs(deploy): record production verification results`

- [ ] **T7. Dockerfile** (C)
  - Cubre: DEP-R10.
  - Commit: `build(deploy): add standalone dockerfile`

## Resultados en producción

| Prueba | Resultado |
|---|---|
| V-1: 10 intentos a ~1 m | pendiente |
| V-2: tiempo hasta resultado | pendiente |
| V-3: 10 canciones fuera del catálogo | pendiente |
| V-6: registro -> identificar -> guardar -> playlist | pendiente |
| p95 `/api/recognize` | pendiente |
