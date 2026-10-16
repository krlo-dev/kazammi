# 08 UI: referencias de diseño

La carpeta `sources/` es **temporal y no va al repo** (está en `.gitignore`). Este documento conserva lo que hay en ella para que la sesión de diseño con Impeccable tenga la referencia aunque la carpeta ya no exista. Si la carpeta sigue disponible, abrir los videos directamente es mejor que leer esta descripción.

## Inventario y reubicación

| Archivo en `sources/` | Qué es | Destino en el proyecto |
|---|---|---|
| `mono.svg` | Logo "Mono DJ": gorila de línea gruesa con audífonos sosteniendo un vinilo. Un solo `path` negro (`fill="#000"`), `viewBox="160 45 775 715"` | `public/brand/kazammi-logo.svg` con `fill="currentColor"` para que tome el color del texto (blanco sobre el fondo oscuro). También `src/app/icon.svg` (favicon por convención de archivos de Next.js) |
| `mono-loader.svg` | Mismo logo animado: la cabeza se balancea al ritmo (`groove`, 1,2 s), el cuerpo "respira" (`breathe`) y salen notas musicales flotando a los lados (`floatL`/`floatR`, 2,4 s). Color por `--logo-color` (por defecto `#111`). Ya respeta `prefers-reduced-motion` | Componente `src/app/_components/brand/LogoLoader.tsx` con el SVG **en línea** (si se usa como `<img>`, la variable CSS no llega y las animaciones pueden no correr). Prefijar las clases internas (`.ink`, `.st`, `.head`, `.body`, `.note`) o usar CSS Modules para que no choquen con estilos globales. `--logo-color` = color de texto del tema |
| `Gemini_Generated_Image_*.jpg` | Imagen raster original de la que se vectorizó el logo | No se usa en el proyecto |
| `original-3a2753….mp4` | Referencia de **login** (3000 x 2300, 7 s) | No va al repo. Descrita abajo |
| `original-4c3e0d….mp4` | Referencia de la **app** (1600 x 1200, 13 s) | No va al repo. Descrita abajo |

Usos del loader: `loading.tsx` de las rutas, la espera tras enviar el login y el arranque de la pantalla de identificar. **No** reemplaza al orbe durante la escucha.

## Referencia A: login (`original-3a2753….mp4`)

**Composición**: fondo negro puro. Detrás, una **cinta de luz iridiscente** (espectro completo: rojo, amarillo, verde, azul, violeta) que cruza la pantalla en horizontal y se ondula lentamente, con desenfoque fuerte, como luz pasando por un prisma. Encima, centrada, una tarjeta oscura.

**Tarjeta**:
- Fondo gris muy oscuro (~`#191919`), esquinas redondeadas grandes (~24 px), borde casi invisible, ligera transparencia.
- Control segmentado en píldora arriba a la izquierda ("Sign up / Sign in") y botón de cerrar circular arriba a la derecha.
- Título en blanco, peso semibold, tamaño grande ("Create an account").
- Campos con fondo `#242326` aprox., esquinas ~10 px, placeholder gris, íconos de línea.
- Botón primario **blanco** de ancho completo (`#f3f3f3`), texto negro.
- Separador "or sign in with" con líneas finas.
- Dos botones sociales lado a lado, fondo gris oscuro (`#3d3c41` aprox.), solo el ícono (Google, Apple).
- Texto legal pequeño y gris al pie.

**Cómo se adapta a Kazammi**:
- Se mantiene casi todo: fondo negro, cinta iridiscente animada, tarjeta oscura, control segmentado, estilo de los campos, botón primario blanco, texto legal.
- Se quita: campo de teléfono, separador "or sign in with" y botones sociales (no hay OAuth), botón de cerrar.
- Control segmentado: **"Iniciar sesión" / "Crear cuenta"**.
- Iniciar sesión: logo arriba, título "Bienvenido de nuevo", campos de correo (ícono de sobre) y contraseña (ícono de candado y botón para mostrarla), botón blanco **"Entrar"**.
- Crear cuenta: título "Crea tu cuenta", campos de nombre, correo y contraseña con la regla visible ("mínimo 8 caracteres"), botón blanco **"Crear cuenta"**.
- Texto al pie: una línea de descripción ("Identifica canciones con la transformada de Fourier").
- La cinta iridiscente **es un espectro de luz**: conecta con la idea del espectro de frecuencias. Implementación sugerida: gradientes animados con desenfoque en CSS o un shader en canvas, siempre con `prefers-reduced-motion` (versión estática).

## Referencia B: app (`original-4c3e0d….mp4`)

**Atmósfera**: fondo con gradiente vertical de negro arriba (`#050609`) a índigo profundo (`#04031a` -> `#1a1045`), con un **resplandor azul violeta en el borde inferior** (`#342393` aprox.). Mucho espacio negativo. Tarjetas de vidrio translúcido con un brillo sutil en el borde.

**Elemento central: el orbe**. Un anillo circular con gradiente neón que pasa de **verde azulado** (teal) a **violeta y magenta** (`#6036a4` aprox. en la parte violeta), con halo difuso y una línea interior nítida. Gira y respira. En el centro, un ícono de micrófono blanco pequeño.

**Tipografía**: sans geométrica. Títulos grandes en peso **light/thin** en dos líneas ("Identifying / Songs"). Títulos de sección en regular. Texto secundario en gris lavanda.

### Pantalla 1: inicio
- Arriba a la izquierda, el título grande en dos líneas.
- Arriba a la derecha, avatar circular con un punto rojo de notificación y un botón circular translúcido con ícono de cuadrícula (menú).
- Centro: el orbe en reposo.
- Abajo: sección "My Music" con un botón píldora "View all" y una tarjeta de vidrio con portada redondeada, título, artista en gris y duración a la derecha. Se intuyen tarjetas apiladas detrás.

### Pantalla 2: escuchando
- Pantalla completa, título centrado "Listening" y botón circular de cerrar (X).
- El orbe crece hasta ocupar casi el ancho y su halo se intensifica, con los colores rotando alrededor.

### Pantalla 3: resultado
- Barra superior con flecha atrás y menú de tres puntos.
- Portada grande cuadrada con esquinas redondeadas, **halo de luz** del mismo color de la portada y partículas brillantes alrededor.
- Título de la canción grande en light y artista debajo; a la derecha un **botón circular blanco** grande (play).
- Línea de metadatos pequeña en gris ("4.3B Views • 19 Nov 2015").
- Botón píldora oscuro "+ Add To Playlist".
- Hoja inferior de vidrio que sube desde abajo con una lista ("Top Songs"): portada, título, artista, duración.

### Cómo se adapta a Kazammi

| Referencia | Kazammi |
|---|---|
| "Identifying Songs" | **"Identificar canciones"** |
| Avatar con punto rojo | Avatar circular con las **iniciales** del usuario sobre un gradiente del tema (sin punto; no hay notificaciones). Abre menú: nombre, correo, **Cerrar sesión** |
| Botón de cuadrícula | Menú de navegación: Identificar, Guardadas, Mis playlists, Cómo funciona |
| Orbe con micrófono | Botón principal para identificar. **Reacciona al audio real**: el radio y el brillo siguen `live.level` y la forma se deforma con `live.spectrum`, calculado con nuestra FFT. Es el puente visual con la matemática |
| "My Music" + "View all" | **"Mis canciones"** (últimas 5 guardadas) + **"Ver todo"** -> `/saved`. Si no hay ninguna, mensaje de estado vacío |
| "Listening" + X | **"Escuchando…"** + cancelar, con el progreso del intento (1/3, 2/3, 3/3) |
| Portada con halo | Portada desde `/api/tracks/[id]/cover`; si no hay, placeholder con gradiente del tema y el logo |
| Botón play blanco | **Botón Guardar** (ícono de marcador o corazón, relleno cuando está guardada). No hay reproducción |
| "4.3B Views • fecha" | Álbum • año • género, y una línea "Empezaste a escuchar en 1:12 · confianza 87%" |
| "+ Add To Playlist" | **"+ Agregar a playlist"**: abre hoja con las playlists (marcadas si ya la contienen) y "Nueva playlist" |
| Hoja "Top Songs" | Acciones "Identificar otra" y "Ver cómo se reconoció" (`/how-it-works`) |

Las pantallas que la referencia no muestra (Guardadas, Mis playlists, detalle de playlist, cómo funciona) siguen el mismo lenguaje: fondo índigo, títulos light grandes, listas en tarjetas de vidrio, píldoras para acciones secundarias, botón blanco para la acción principal.

## Tokens iniciales (aproximados, muestreados de los videos)

| Token | Valor | Uso |
|---|---|---|
| `--bg-0` | `#050609` | Fondo superior |
| `--bg-1` | `#0b0726` | Fondo medio |
| `--bg-glow` | `#342393` | Resplandor inferior |
| `--ring-teal` | `#1fd1a5` | Inicio del gradiente del orbe |
| `--ring-violet` | `#6036a4` | Medio del gradiente del orbe |
| `--ring-magenta` | `#c03cff` | Final del gradiente del orbe |
| `--surface-glass` | `rgba(255,255,255,0.06)` + `backdrop-filter: blur(20px)` | Tarjetas y hojas |
| `--surface-card` | `#191919` | Tarjeta de login |
| `--text-1` | `#ffffff` | Texto principal |
| `--text-2` | `#a49fc4` | Texto secundario (gris lavanda) |
| `--action-primary` | `#f3f3f3` | Botón primario blanco |

Son un punto de partida: la sesión de diseño los ajusta para cumplir contraste WCAG AA y los deja registrados en `design.md`.
