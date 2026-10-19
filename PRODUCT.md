# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Público de la presentación** (compañeros de clase): ve la demo en un proyector. Quiere ver que funciona y entender por qué.
- **Profesor**: evalúa el rigor matemático. Necesita ver el vínculo entre las ecuaciones (DFT, STFT, hash, desfase) y lo que hace la app.
- **Usuario con el celular**: inicia sesión, acerca el micrófono a una canción que suena, la identifica y la guarda en su biblioteca.
- **Visitante del portafolio** (reclutadores, otros desarrolladores): llega después del curso sin haber visto la presentación y tiene que entender y valorar el proyecto por sí solo.

El escenario proyectado y el del celular pesan igual: ninguno puede quedar flojo.

## Product Purpose

Kazammi es un reconocedor de canciones al estilo Shazam cuyo núcleo matemático (FFT, espectrograma, fingerprinting y matching) está implementado desde cero, sin librerías de DSP. Es la demo funcional de una investigación universitaria sobre la transformada de Fourier, y después será una pieza del portafolio de su autor.

Éxito: una persona inicia sesión, toca un botón, la app escucha unos segundos y dice qué canción suena; la persona la guarda o la agrega a una playlist, y puede ver cómo se reconoció.

## Positioning

El reconocimiento no es una API externa: cada paso, desde la FFT hasta el histograma de desfases, es código propio y se puede mostrar con los datos reales de la última escucha. La app es a la vez producto y demostración de la matemática.

## Operating Context

- Presentación en clase, con la app proyectada y una canción sonando en un parlante a ~1 m del micrófono.
- Uso en el celular por HTTPS (requisito del micrófono), con la sesión ya iniciada.
- Catálogo de decenas de canciones de prueba ingeridas desde una carpeta local. Solo se reconocen canciones de ese catálogo.
- Metas de la demo: reconocer >= 8 de 10 intentos a ~1 m, resultado en <= 10 s, 0 falsos positivos.

## Capabilities and Constraints

- Login obligatorio con correo y contraseña. Sin OAuth, sin verificación de correo ni recuperación de contraseña.
- Identificar por micrófono con intentos acumulativos a los 4, 8 y 12 s; estados: reposo, pidiendo permiso, escuchando, encontrada, no encontrada y errores específicos.
- Biblioteca por usuario: **Guardadas** (playlist general, no se renombra ni borra) y playlists personalizadas (crear, renombrar, borrar, agregar y quitar canciones). Límites: 50 playlists y 500 canciones por playlist.
- Vista "Cómo funciona" con los datos del último intento: forma de onda, espectrograma, constelación de picos, hashes e histograma de desfases.
- No se reproduce audio, no se explora el catálogo completo, no se suben archivos.
- Terminología: "Guardadas", "Mis playlists", "Mis canciones", "Identificar", "Cómo funciona".
- Stack existente: Next.js App Router, TypeScript, Tailwind CSS 4, PostgreSQL en Neon, Better Auth; despliegue en Vercel.

## Brand Commitments

- Nombre: **Kazammi**.
- Logo "Mono DJ": gorila de línea gruesa con audífonos sosteniendo un vinilo (`sources/mono.svg`), y su versión animada (`sources/mono-loader.svg`).
- Las referencias visuales de `specs/08-ui/design-references.md` son **obligatorias**, con las adaptaciones a Kazammi ya escritas en ese documento.
- Todo el texto visible en español. Código y commits en inglés.
- No copiar Shazam (ni su azul ni su logo).

## Evidence on Hand

- Métricas reales de la evaluación offline (`npm run eval`) y del fingerprint v2 en `specs/03-fingerprint/tasks.md` y `specs/06-recognition`.
- Prueba con micrófono real del 2026-10-19: "Touch" de Daft Punk reconocida con score 35 contra 5 y confianza 0,75.
- No hay testimonios, usuarios reales ni métricas de uso: no inventarlos.

## Product Principles

1. La matemática se ve: la interfaz conecta lo que el usuario oye con el espectro que calcula la FFT propia.
2. Cada estado tiene respuesta: el usuario siempre sabe qué está pasando y qué hacer después.
3. Se sostiene sola: alguien que no vio la presentación entiende qué hace la app y por qué es interesante.
4. Funciona en vivo: rápida, legible a distancia y confiable frente a un público.

## Accessibility & Inclusion

WCAG 2.1 AA: contraste, foco visible, navegación con teclado, `aria-live` en los cambios de estado, texto alternativo en las portadas. Respeta `prefers-reduced-motion`. Funciona desde 360 px de ancho y proyectada.
