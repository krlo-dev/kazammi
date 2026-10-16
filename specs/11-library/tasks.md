# 11 Library: tareas

- [ ] **T1. Esquema de la biblioteca**
  - Cubre: LIB-R15.
  - Verifica: migración aplicada en `dev`; el `INSERT` directo inválido falla por FK en PGlite.
  - Commit: `feat(db): add saved tracks and playlists schema`

- [ ] **T2. Guardadas**
  - Cubre: LIB-R1, LIB-R2, LIB-R3, LIB-R4, LIB-R5.
  - Commit: `feat(library): add saved tracks service`

- [ ] **T3. Playlists**
  - Cubre: LIB-R6 a LIB-R14, LIB-R16.
  - Commit: `feat(library): add saved tracks and custom playlists`

- [ ] **T4. Tests de aislamiento entre usuarios**
  - Cubre: LIB-R14 y todos los criterios de aceptación.
  - Commit: `test(library): add ownership and cascade integration tests`

- [ ] **T5. Server actions**
  - Commit: `feat(library): add server actions for library mutations`

- [ ] **T6. `saved` en el reconocimiento**
  - Conectar `library.isSaved` en `/api/recognize` (ver `06-recognition/design.md`).
  - Commit: `feat(recognition): include saved status in recognize response`

- [ ] **T7. Reordenar** (C)
  - Cubre: LIB-R17. Requiere agregar una columna `position`.
  - Commit: `feat(library): allow reordering playlist tracks`
