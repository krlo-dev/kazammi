# 08 UI: requisitos

## Cómo se construye esta parte

El diseño visual lo hace **Claude Code con el skill Impeccable**, siguiendo las referencias de [`design-references.md`](./design-references.md) (login iridiscente, app índigo con orbe neón, logo Mono DJ). Esta spec define **qué** muestra cada pantalla, sus estados y sus datos; las decisiones visuales finales se registran en `design.md`.

Reglas:
- La pantalla de identificar solo consume `useRecognizer()` (de `@/modules/capture`).
- Las pantallas de biblioteca leen con Server Components y modifican con las Server Actions de `11-library`.
- La UI no importa `dsp`, `fingerprint`, `catalog`, `recognition` ni `db`.

## Pantallas

| Ruta | Propósito | Prioridad |
|---|---|---|
| `/login` | Iniciar sesión o crear cuenta | M |
| `/` | Identificar una canción y ver el resultado | M |
| `/saved` | Guardadas (playlist general) | M |
| `/playlists` | Mis playlists | M |
| `/playlists/[id]` | Detalle de una playlist | M |
| `/how-it-works` | Explicar el pipeline con los datos de la última escucha | S |

## Requisitos: navegación y perfil

| ID | Prioridad | Requisito |
|---|---|---|
| UI-R1 | M | Todas las pantallas autenticadas DEBEN tener un header con el avatar del perfil y un botón de menú, como en la referencia B. |
| UI-R2 | M | El avatar DEBE mostrar las iniciales del nombre y abrir un menú con nombre, correo y "Cerrar sesión". |
| UI-R3 | M | El menú de navegación DEBE dar acceso a Identificar, Guardadas, Mis playlists y Cómo funciona. |

## Requisitos: login (`/login`)

| ID | Prioridad | Requisito |
|---|---|---|
| UI-R4 | M | DEBE seguir la referencia A: fondo negro con cinta iridiscente animada y tarjeta oscura con control segmentado **"Iniciar sesión / Crear cuenta"**. Iniciar sesión pide correo y contraseña; crear cuenta pide nombre, correo y contraseña. Botón primario blanco de ancho completo. |
| UI-R5 | M | Los campos DEBEN validar en el cliente con las mismas reglas del servidor (correo válido, contraseña de 8 a 64 caracteres) y mostrar el error junto al campo. El campo de contraseña DEBE tener botón para mostrarla u ocultarla. |
| UI-R6 | M | Mientras se envía, el botón DEBE mostrar estado de carga y deshabilitarse. Los errores del servidor (correo ya registrado, credenciales incorrectas, demasiados intentos) DEBEN mostrarse sobre el formulario. |

## Requisitos: identificar (`/`)

| ID | Prioridad | Requisito |
|---|---|---|
| UI-R7 | M | El orbe DEBE ser la acción principal: tocarlo inicia la escucha. Visible y alcanzable con el pulgar en móvil. |
| UI-R8 | M | La UI DEBE representar cada estado de `RecognizerState` (tabla abajo). Ningún estado puede quedar sin diseño. |
| UI-R9 | M | MIENTRAS escucha, el orbe DEBE reaccionar al audio real (`live.level` y `live.spectrum`) y mostrarse el progreso del intento. |
| UI-R10 | M | Debajo del orbe, en reposo, DEBE estar "Mis canciones" con las 5 últimas guardadas y "Ver todo". |
| UI-R11 | M | CUANDO hay match, DEBE mostrarse el resultado: portada con halo, título, artista, álbum • año • género, segundo de la canción y confianza. |
| UI-R12 | M | El resultado DEBE tener el botón circular **Guardar** (alterna guardado/no guardado con actualización optimista) y la píldora **"+ Agregar a playlist"**. |
| UI-R13 | M | "Agregar a playlist" DEBE abrir una hoja con las playlists del usuario (marcadas si ya contienen la canción) y "Nueva playlist" (crear y agregar en un paso). |
| UI-R14 | M | Cada estado de error DEBE explicar qué pasó y qué hacer; `unauthorized` lleva a `/login`. |
| UI-R15 | M | El usuario DEBE poder cancelar durante la escucha y volver a intentar desde cualquier estado final. |
| UI-R16 | S | Desde el resultado DEBE haber un enlace "Ver cómo se reconoció" hacia `/how-it-works`. |

### Estados de identificar

| Estado | Qué ve el usuario |
|---|---|
| `idle` | Título "Identificar canciones", orbe en reposo con micrófono, "Mis canciones" |
| `requesting` | Indicación de aceptar el permiso del micrófono |
| `listening` | Pantalla completa, "Escuchando…", orbe grande reactivo, intento 1/3 a 3/3, indicador de procesamiento, botón cancelar |
| `matched` | Pantalla de resultado (UI-R11 a UI-R13), "Identificar otra" |
| `no_match` | No se encontró; sugerencias (acercar el micrófono, subir el volumen, la canción debe estar en el catálogo), "Intentar de nuevo" |
| `error: permission_denied` | Cómo habilitar el micrófono en el navegador |
| `error: unsupported` / `insecure_context` | Navegador no compatible o falta HTTPS |
| `error: network` | Sin conexión con el servidor, "Reintentar" |
| `error: unauthorized` | La sesión expiró; redirige a `/login` |
| `error: version_mismatch` | La app se actualizó, "Recargar" |

## Requisitos: biblioteca

| ID | Prioridad | Requisito |
|---|---|---|
| UI-R17 | M | `/saved` DEBE listar Guardadas con portada, título, artista y duración, con carga incremental. Cada fila DEBE permitir "Agregar a playlist" y "Quitar de Guardadas" (con confirmación, avisando que se quita de sus playlists). |
| UI-R18 | M | `/playlists` DEBE mostrar primero la tarjeta fija **Guardadas** y luego las playlists del usuario con mosaico de hasta 4 portadas y cantidad de canciones, más el botón "Nueva playlist". |
| UI-R19 | M | `/playlists/[id]` DEBE listar las canciones y permitir quitar canciones, renombrar (S) y borrar la playlist (con confirmación). |
| UI-R20 | M | Las pantallas vacías (sin guardadas, sin playlists, playlist vacía) DEBEN explicar qué hacer y ofrecer ir a Identificar. |
| UI-R21 | M | Una playlist inexistente o ajena DEBE mostrar la página 404 de la app. |

## Requisitos: cómo funciona (`/how-it-works`)

| ID | Prioridad | Requisito |
|---|---|---|
| UI-R22 | S | DEBE mostrar, en orden, los pasos del pipeline con los datos reales del último intento: forma de onda, espectrograma, constellation map, ejemplos de pares de hashes e histograma de desfases con el pico del ganador resaltado. |
| UI-R23 | S | Cada paso DEBE tener una explicación breve y su ecuación principal (DFT, STFT, hash, δ = t_db − t_q), renderizada con KaTeX. |
| UI-R24 | S | SI no hay una escucha previa, ENTONCES DEBE invitar a hacer una primero. |
| UI-R25 | C | Mini demo interactivo: senoidal de frecuencia ajustable y su espectro calculado con la FFT propia en tiempo real. |

## Requisitos transversales

| ID | Prioridad | Requisito |
|---|---|---|
| UI-R26 | M | Tema **oscuro** únicamente, según las referencias. (Tema claro: W en v1.) |
| UI-R27 | M | La UI DEBE funcionar desde 360 px de ancho y verse bien proyectada. En escritorio, el contenido se centra con un ancho máximo y el fondo índigo ocupa toda la ventana. |
| UI-R28 | M | DEBE cumplir WCAG 2.1 AA: contraste, foco visible, navegación con teclado, `aria-live` para cambios de estado, textos alternativos en portadas. |
| UI-R29 | M | DEBE respetar `prefers-reduced-motion`: orbe, cinta iridiscente y loader en versión estática o mínima. |
| UI-R30 | M | Todo el texto visible DEBE estar en español. |
| UI-R31 | M | El logo y el loader DEBEN usarse según la tabla de reubicación de `design-references.md`. |
