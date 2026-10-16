# 08 UI: tareas

Todas las tareas se hacen en Claude Code con el skill Impeccable, después de que `07-capture`, `10-auth` y `11-library` funcionen con páginas temporales sin estilos. Antes de empezar, leer `design-references.md` y, si `sources/` todavía existe, revisar los videos.

- [ ] **T1. Marca: logo, favicon y loader**
  - Mover `sources/mono.svg` y `sources/mono-loader.svg` a sus destinos (tabla de reubicación).
  - Cubre: UI-R31.
  - Commit: `feat(ui): add kazammi logo, favicon and animated loader`

- [ ] **T2. Tokens, tipografía y layout base**
  - Cubre: UI-R26, UI-R27, UI-R30. Registrar decisiones en `design.md`.
  - Commit: `feat(ui): add design tokens and base layout`

- [ ] **T3. Login**
  - Cubre: UI-R4, UI-R5, UI-R6.
  - Commit: `feat(ui): add sign in and sign up screen with iridescent backdrop`

- [ ] **T4. Header, perfil y navegación**
  - Cubre: UI-R1, UI-R2, UI-R3.
  - Commit: `feat(ui): add app header with profile and navigation menus`

- [ ] **T5. Identificar: orbe y estados**
  - Cubre: UI-R7, UI-R8, UI-R9, UI-R10, UI-R14, UI-R15.
  - Commit: `feat(ui): add identify screen with reactive orb`

- [ ] **T6. Resultado, guardar y agregar a playlist**
  - Cubre: UI-R11, UI-R12, UI-R13, UI-R16.
  - Commit: `feat(ui): add match view with save and playlist sheet`

- [ ] **T7. Guardadas**
  - Cubre: UI-R17, UI-R20.
  - Commit: `feat(ui): add saved tracks screen`

- [ ] **T8. Playlists**
  - Cubre: UI-R18, UI-R19, UI-R20, UI-R21.
  - Commit: `feat(ui): add playlists and playlist detail screens`

- [ ] **T9. Cómo funciona** (S)
  - Cubre: UI-R22, UI-R23, UI-R24.
  - Commit: `feat(ui): add how-it-works pipeline view`

- [ ] **T10. Demo interactivo de FFT** (C)
  - Cubre: UI-R25.
  - Commit: `feat(ui): add interactive fft playground`

- [ ] **T11. Auditoría y pulido**
  - Cubre: UI-R28, UI-R29. Comandos de auditoría y pulido de Impeccable; probar a 360 px, proyectado y con movimiento reducido.
  - Commit: `fix(ui): address accessibility and responsive audit findings`

- [ ] **T12. Borrar `sources/`** (manual, Krlo)
  - Cuando T1 a T11 estén hechas. Sin commit (la carpeta nunca estuvo en el repo).
