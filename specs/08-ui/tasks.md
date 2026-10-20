# 08 UI: tareas

Todas las tareas se hacen en Claude Code con el skill Impeccable, después de que `07-capture`, `10-auth` y `11-library` funcionen con páginas temporales sin estilos. Antes de empezar, leer `design-references.md` y, si `sources/` todavía existe, revisar los videos.

- [x] **T1. Marca: logo, favicon y loader**
  - Mover `sources/mono.svg` y `sources/mono-loader.svg` a sus destinos (tabla de reubicación).
  - Cubre: UI-R31.
  - Commit: `feat(ui): add kazammi logo, favicon and animated loader`

- [x] **T2. Tokens, tipografía y layout base**
  - Cubre: UI-R26, UI-R27, UI-R30. Registrar decisiones en `design.md`.
  - Commit: `feat(ui): add design tokens and base layout`

- [x] **T3. Login**
  - Cubre: UI-R4, UI-R5, UI-R6.
  - Commit: `feat(ui): add sign in and sign up screen with iridescent backdrop`

- [x] **T4. Header, perfil y navegación**
  - Cubre: UI-R1, UI-R2, UI-R3.
  - Commit: `feat(ui): add app header with profile and navigation menus`

- [x] **T5. Identificar: orbe y estados**
  - Cubre: UI-R7, UI-R8, UI-R9, UI-R10, UI-R14, UI-R15.
  - Commit: `feat(ui): add identify screen with reactive orb`

- [x] **T6. Resultado, guardar y agregar a playlist**
  - Cubre: UI-R11, UI-R12, UI-R13, UI-R16.
  - Commit: `feat(ui): add match view with save and playlist sheet`

- [x] **T7. Guardadas**
  - Cubre: UI-R17, UI-R20.
  - Commit: `feat(ui): add saved tracks screen`

- [x] **T8. Playlists**
  - Cubre: UI-R18, UI-R19, UI-R20, UI-R21.
  - Commit: `feat(ui): add playlists and playlist detail screens`

- [x] **T9. Cómo funciona** (S)
  - Cubre: UI-R22, UI-R23, UI-R24.
  - Commit: `feat(ui): add how-it-works pipeline view`

- [ ] **T10. Demo interactivo de FFT** (C)
  - Cubre: UI-R25.
  - Commit: `feat(ui): add interactive fft playground`

- [x] **T11. Auditoría y pulido**
  - Cubre: UI-R28, UI-R29. Comandos de auditoría y pulido de Impeccable; probar a 360 px, proyectado y con movimiento reducido.
  - Commit: `fix(ui): address accessibility and responsive audit findings`

- [x] **T13. Muestra de audio, listas al día y volver desde Guardadas**
  - Cubre: UI-R32, UI-R33, UI-R34.
  - Bug: al crear una playlist, ir a Guardadas y agregarle una canción, la playlist seguía vacía al volver (con el botón atrás o por el menú) hasta recargar. Causa: Next 16 mantiene montadas las páginas visitadas, y `PlaylistDetail` y `SavedList` copiaban sus datos a un estado local solo al montarse, así que ignoraban los datos nuevos que traía la revalidación. Ahora adoptan los props nuevos cuando cambian.
  - Verifica: reproducción en Edge headless (crear playlist, agregar desde Guardadas, volver por atrás y por el menú): antes "0 canciones", ahora la canción aparece; muestra que suena y se detiene sola a los 5 s en Guardadas (1280 y 390 px).
  - Commit: `fix(ui): keep library lists fresh, add a back link to saved and sample buttons`

- [ ] **T12. Borrar `sources/`** (manual, Krlo)
  - Cuando T1 a T11 estén hechas. Sin commit (la carpeta nunca estuvo en el repo).

## Resultados medidos

| Medida | Valor |
|---|---|
| Flujo completo con micrófono simulado (Edge headless, "One More Time" de `data/songs`) | Reconocida en todas las corridas: login, identificar, guardar, agregar a playlist, cómo funciona |
| Viewports revisados | 1440x900, 390x844 y 360x740 con `prefers-reduced-motion`; sin desbordamiento horizontal |
| Contraste | Texto secundario `#b9b4dc` al menos 7:1 en todo el campo; terciario `#9a94c2` al menos 4,97:1 sobre vidrio |
| `impeccable detect` | Sin hallazgos |
| Revisión final de Impeccable | Ship, tras una recaptura, un rebuild y dos rondas de arreglos (ver `design.md`) |
