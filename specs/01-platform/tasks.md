# 01 Platform: tareas

- [x] **T1. Specs iniciales en el repo**
  - Cubre: todas las specs `00-11`, `CLAUDE.md`, `README.md` mínimo, `.gitignore`.
  - Verifica: los archivos están en `main` y `sources/` **no** aparece en `git status`.
  - Commit: `docs(specs): add initial sdd specs and project roadmap`

- [x] **T2. Scaffold de Next.js**
  - Cubre: PLT-R1, PLT-R2 (parcial).
  - Verifica: `npm run dev` muestra la página por defecto; `npm run build` pasa.
  - Commit: `chore(platform): scaffold next.js app with typescript strict`

- [x] **T3. Estructura de módulos**
  - Cubre: PLT-R3.
  - Crea `src/modules/{dsp,fingerprint,capture,db,auth,catalog,recognition,library}/index.ts`, `src/shared/`, `scripts/ingest/`, `scripts/eval/`.
  - Commit: `chore(platform): add modular monolith folder structure`

- [x] **T4. Vitest y Prettier**
  - Cubre: PLT-R2.
  - Verifica: un test trivial en `src/shared/__tests__` pasa con `npm test`.
  - Commit: `chore(platform): configure vitest and prettier`

- [x] **T5. Límites entre módulos en ESLint**
  - Cubre: PLT-R4.
  - Verifica: el import prohibido de prueba falla; se elimina después de comprobarlo.
  - Commit: `chore(platform): enforce module boundaries with eslint`

- [ ] **T6. Variables de entorno**
  - Cubre: PLT-R6, PLT-R9.
  - Verifica: `npm run build` sin `.env.local` termina bien.
  - Commit: `chore(platform): add lazy validated env and env example`

- [ ] **T7. Health endpoint**
  - Cubre: PLT-R7.
  - Verifica: `curl localhost:3000/api/health` devuelve `status: "ok"`.
  - Commit: `feat(platform): add health check endpoint`

- [ ] **T8. CI en GitHub Actions**
  - Cubre: PLT-R5.
  - Verifica: workflow en verde tras el push.
  - Commit: `ci(platform): add lint, typecheck, test and build workflow`

- [ ] **T9. README**
  - Cubre: PLT-R8.
  - Commit: `docs(platform): add readme with setup instructions`
