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

Sesión del 2026-10-19 con Impeccable (`init`, flujo de trabajo nuevo, camino code-first porque no hay generación de imágenes). El contexto quedó en `PRODUCT.md` y el contrato de dirección en `.impeccable/surfaces/src-app-app-page-tsx.md`.

- **Mundo visual**: el de las referencias, obligatorio por decisión de Krlo. No se corrió el sorteo de direcciones de Impeccable: una dirección fijada por el brief gana sobre el sorteo.
- **Tipografía**: Geist (ya venía con el scaffold). Es la cara abierta más cercana a la sans geométrica light de las referencias, con pesos 300 a 600 y numerales tabulares. Títulos en 300 y en dos tonos: primera palabra en blanco y el resto en lavanda (no es texto con gradiente).
- **Tokens** (`@theme` en `src/app/globals.css`): campo `#050609` a `#0b0726` a `#1a1045` con horizonte `#342393`; luz `#1fd1a5`, `#6036a4`, `#c03cff`. El texto secundario sube de `#a49fc4` (referencia) a `#b9b4dc` para proyectar: al menos 7:1 en todo el campo. El terciario es `#9a94c2`, al menos 4,97:1 incluso sobre vidrio. Violeta y magenta nunca se usan como texto.
- **Login**: la cinta de luz es un SVG en línea (`src/app/login/Ribbon.tsx`) con `feGaussianBlur`: un trazo blanco azulado entra por la izquierda y se abre en una ola saturada a la derecha, como en la referencia. Se eligió SVG y no canvas porque `ctx.filter` no es confiable en Safari. En pantallas de menos de 640 px la cinta baja y se ve debajo de la tarjeta.
- **Orbe**: canvas 2D que lee `live` desde una ref, sin renders de React por frame. El borde son las 128 bandas del espectro en espejo (graves abajo) y el radio sigue `live.level`. Una pista exterior se llena en 12 s, con marcas a los 4, 8 y 12 s que brillan mientras el intento se procesa. Con `prefers-reduced-motion` el anillo queda quieto y solo avanza la pista.
- **Resultado**: el anillo se contrae y la portada florece desde un círculo, con un halo del color promedio de la portada (muestreado en canvas). El botón Guardar usa `useOptimistic`; agregar a una playlist también lo marca como guardado.
- **Hojas**: `<dialog>` nativo (foco atrapado, Esc y fondo inerte gratis), hoja inferior en el celular y centrada en escritorio.
- **Cómo funciona**: un paso por pantalla con su ecuación (KaTeX renderizado en el servidor) y los datos reales de la última escucha, que `capture` guarda en un store de la pestaña. Se pierden al recargar; entonces la página invita a identificar una canción.
- **Portadas**: `next/image` con `unoptimized`, porque la ruta de portadas exige la cookie de sesión y el optimizador no la envía.
- **CSS modules**: no se usan. La regla `"*.css"` de Turbopack en `next.config.ts` también captura los `*.module.css`, que quedaban sin aplicar; esos estilos viven en `globals.css` con prefijo `kz-`.
- **Ajustes del 2026-10-20 (pedido de Krlo)**: en escritorio, el título "Identificar canciones" y "Mis canciones" se centran sobre el eje del orbe, como ya se veía en el celular; en el celular el título sigue arriba a la izquierda. El logo del encabezado pasa de 32 a 44 px (48 px en escritorio) y el login de 36 a 48 px. El loader pasa de 112 a 176 px (224 px en escritorio). En escritorio, la marca del encabezado (Mono DJ y "Kazammi") pasa al centro, sobre el eje del título y del orbe. Mientras escucha, el micrófono del orbe cambia por el Mono DJ animado del loader. En el menú principal, los ítems llevan 6 px de separación y el anillo de foco va por dentro del ítem (`outline-offset: -2px`): al abrir el menú, el foco cae en el primero y su anillo exterior quedaba pegado al borde del panel y al ítem siguiente.
- **Muestra de audio (2026-10-20)**: `PreviewButton` con dos variantes: sobre la portada de cada fila (play centrado en un círculo translúcido que, con mouse, solo aparece al pasar el cursor o con foco de teclado; en pantallas táctiles queda visible porque no hay hover) y como botón "Escuchar muestra" en el resultado. Un solo `Audio` para toda la pestaña (`preview-player.ts`, con `useSyncExternalStore`), así que iniciar una muestra detiene la anterior. La muestra se descarga como blob y suena desde una URL de objeto, porque Safari solo reproduce `<audio>` en streaming si el servidor responde rangos de bytes. Mientras suena, un anillo turquesa se llena en 5 s (estático con movimiento reducido).
- **Orbe en reposo**: el borde ondulaba siempre (dos senos de 0,8% y 0,6% del radio) y en reposo se veía achatado. Ahora esa ondulación entra con la escucha (`presence`): en reposo el borde es un círculo y solo respira.
- **Mis canciones como baraja**: con 2 o más canciones, la más reciente va al frente y las demás asoman 9, 16 y 21 px por debajo, más angostas, como las tarjetas apiladas de la referencia (`RecentStack`). La baraja vive en un rectángulo del alto de una tarjeta más los bordes, y la página no crece: al hacer scroll dentro del rectángulo (rueda, dedo o flechas) las canciones pasan como un carrusel, la del frente se desvanece y la siguiente sale de atrás. Es un contenedor con scroll nativo y ajuste a cada tarjeta (`snap-always`, para que un gesto rápido no salte varias); las tarjetas están en una capa `sticky` y sus transformaciones siguen el `scrollTop` cuadro a cuadro. Cada gesto avanza exactamente una canción: un touchpad (y algunas ruedas, por la inercia) manda eventos durante casi un segundo, así que después de avanzar se ignora el resto del gesto hasta que los eventos se detienen 220 ms. En los extremos el evento sigue hacia la página. Junto a "Ver todo", un botón con flecha baja una canción por clic; en la última cambia a flecha hacia arriba y vuelve a la primera. Como el vidrio es translúcido, cada tarjeta recorta la parte que sigue detrás de la anterior; solo la del frente recibe clics y foco (`inert` en las demás).
- **Listas al día**: un componente cliente que copia props a estado (`useState(props)`) también guarda los props de origen y los adopta cuando cambian, porque Next 16 conserva montadas las páginas visitadas.
- **Fuera de alcance de esta sesión**: T10 (demo de FFT, prioridad C).

### Verificación

- Dos rondas de capturas con Edge headless a 1440x900 y 390x844, con una canción de `data/songs` como micrófono simulado: el flujo login, identificar, guardar, agregar a playlist y cómo funciona reconoció la canción en las cuatro corridas.
- `impeccable detect`: sin hallazgos.
- Revisión final de Impeccable (revisor independiente, con capturas por pantalla):
  1. Recaptura: capturas de página completa y el indicador de desarrollo de Next invalidaban la evidencia.
  2. Rebuild: el orbe no tenía la luz difusa de la referencia, la cinta del login era una línea fina, el inicio dejaba una columna vacía y las etiquetas de los gráficos se veían a 10 px.
  3. Fix: escala del orbe, cinta en el celular, chip del histograma y etiquetas de la constelación.
  4. Ronda extra aprobada por Krlo: año 1970 (ver `05-ingestion` T7), "Mis canciones" dentro de la primera pantalla en escritorio y etiquetas sin choques. Veredicto final: ship.
