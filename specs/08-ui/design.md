# 08 UI: diseño

> Este archivo se completa **durante** la sesión de diseño con Claude Code + Impeccable. Lo que sigue son el brief y las restricciones técnicas. Las referencias visuales están en [`design-references.md`](./design-references.md).

## Brief para la sesión de diseño

- **Producto**: Kazammi, reconocedor de canciones hecho desde cero para una presentación universitaria sobre la transformada de Fourier, con biblioteca personal.
- **Audiencia**: compañeros y profesor viendo la pantalla proyectada; también se probará en el celular.
- **Dirección visual**: la de las referencias. Login negro con cinta de luz iridiscente; app en gradiente negro a índigo con resplandor violeta, orbe neón teal a magenta, títulos grandes en peso light, tarjetas de vidrio.
- **Identidad**: el logo Mono DJ (gorila con audífonos y vinilo, línea gruesa) en blanco sobre el fondo oscuro; el loader animado en las esperas.
- **Momento clave**: la transición de `listening` a `matched`. El orbe que reacciona al espectro real se "resuelve" en la portada con halo.
- **Evitar**: copiar Shazam (ni su azul ni su logo), plantillas genéricas, reproducir textos en inglés de las referencias.

## Restricciones técnicas

- Estilos con Tailwind CSS 4, que viene del scaffold (ver `01-platform/design.md`); los tokens se definen con `@theme` en `src/app/globals.css`.
- `"use client"` solo donde haga falta (identificar, hoja de playlists, menús); el resto, Server Components.
- Orbe, cinta iridiscente y visualizaciones con `<canvas>`/CSS y `requestAnimationFrame`, sin re-renders de React por frame.
- Portadas con `next/image` apuntando a `/api/tracks/[id]/cover`.
- Formularios de auth con `authClient` de `@/modules/auth/client` y validación zod compartida con el servidor.
- Mutaciones con las Server Actions de `11-library` y `useOptimistic` para Guardar.
- KaTeX para ecuaciones en `/how-it-works`.
- Componentes en `src/app/_components/`.

## Componentes previstos

| Componente | Datos |
|---|---|
| `AppHeader`, `ProfileMenu`, `NavMenu` | Usuario de la sesión |
| `IridescentBackdrop` | Ninguno (decorativo) |
| `AuthCard`, `SignInForm`, `SignUpForm` | `authClient.signIn.email`, `authClient.signUp.email` |
| `Orb` | `state.status`, `live.level`, `live.spectrum`, `start`, `cancel` |
| `AttemptProgress` | `state.elapsedMs`, `state.attempt`, `state.processing` |
| `MatchView` | `state.result` (canción, confianza, desfase, `saved`) |
| `SaveButton` | `trackId`, `saved` |
| `AddToPlaylistSheet` | `playlistsForTrack(trackId)` |
| `TrackRow` | `Track` + acciones |
| `PlaylistCard` | `PlaylistSummary` (mosaico de portadas) |
| `StateMessage` | Estados vacíos, `no_match` y errores |
| `LogoLoader` | `--logo-color` |
| `SpectrogramCanvas`, `OffsetHistogram`, `Equation` | Datos de depuración |

## Decisiones de la sesión de diseño

(Completar: tipografías elegidas, tokens finales y contraste, comandos de Impeccable usados y resultados del audit.)
