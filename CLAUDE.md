# CLAUDE.md

Instrucciones para Claude Code en este repositorio.

## Proyecto

Kazammi es un reconocedor de canciones estilo Shazam con FFT, fingerprinting y matching implementados desde cero, con registro e inicio de sesión por correo y contraseña (hash bcrypt), canciones guardadas y playlists. Es la demo funcional de una investigación universitaria sobre la transformada de Fourier. Monolito modular en Next.js (App Router) + TypeScript + PostgreSQL en Neon + Better Auth.

## Spec Driven Development

`specs/` es la fuente de verdad. Antes de escribir código:

1. Lee `specs/README.md` y los documentos de `specs/00-foundation/`.
2. Lee `requirements.md`, `design.md` y `tasks.md` del módulo en el que vas a trabajar.
3. Implementa **una tarea a la vez**, en el orden de `tasks.md` y de `roadmap.md`.
4. Si la spec está mal o incompleta, propón primero el cambio a la spec y espera confirmación.
5. Al terminar una tarea: tests en verde, marca `[x]` en `tasks.md` y muestra el mensaje de commit sugerido.

## Git

- **No ejecutes `git commit`, `git push` ni nada que reescriba la historia.** Krlo hace todos los commits y pushes.
- Al final de cada tarea, entrega el mensaje de commit en Conventional Commits (en inglés), tal como aparece en `tasks.md` o ajustado si cambió el alcance.

## Reglas de código

- Código, identificadores, comentarios y commits en inglés. Specs, README y textos de UI en español.
- Respeta los límites entre módulos de `specs/00-foundation/architecture.md`: importa cada módulo solo por su `index.ts` (excepción: `@/modules/auth/client`).
- `src/modules/dsp` y `src/modules/fingerprint` son TypeScript puro e isomórfico: sin React, Next, DOM ni Node.
- No uses librerías de FFT ni de DSP. La FFT propia es el objetivo del proyecto.
- Cualquier cambio en los parámetros o el algoritmo de fingerprint incrementa `FINGERPRINT_VERSION`.
- El `userId` siempre sale de la sesión en el servidor (`requireUser()`), nunca del cliente.
- Nunca subas audio, `.env*` ni la carpeta `sources/` al repo.

## UI

- El diseño se hace con el skill **Impeccable**, siguiendo `specs/08-ui/design-references.md`.
- `sources/` es una carpeta temporal fuera del repo con el logo, el loader y los videos de referencia. Reubica el logo y el loader según la tabla de `design-references.md`; no copies los videos ni la imagen raster al proyecto.
- La pantalla de identificar consume solo `useRecognizer()`; la biblioteca usa Server Components y las Server Actions de `11-library`.
- Registra las decisiones de diseño en `specs/08-ui/design.md`.

## Escritura

- En documentación, comentarios y mensajes no uses rayas largas (em-dash). Usa comas, dos puntos o puntos.

## Comandos

```bash
npm run dev          # servidor de desarrollo
npm run lint         # eslint (incluye límites entre módulos)
npm run typecheck    # tsc --noEmit
npm test             # vitest (BD con PGlite)
npm run db:migrate   # migraciones contra DATABASE_URL
npm run ingest       # ingesta de data/songs (ver specs/05-ingestion)
npm run eval         # evaluación offline (ver specs/06-recognition)
```
