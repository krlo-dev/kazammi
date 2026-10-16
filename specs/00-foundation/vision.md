# Visión

## Contexto

Actividad del 10%, opción 2: *investigar el funcionamiento del reconocimiento de audio (música) y el uso de la transformada de Fourier*. Entregables: investigación en formato IEEE doble columna, modelos matemáticos, demo funcional e informe en PDF.

Kazammi es la **demo funcional**: un reconocedor de canciones al estilo Shazam cuyo núcleo matemático (FFT, espectrograma, fingerprinting y matching) está implementado desde cero, sin librerías de DSP, con cuentas de usuario para guardar lo que se identifica.

## Objetivo

Que una persona inicie sesión, acerque el micrófono a una canción que suena y, en pocos segundos, la aplicación diga cuál es y le permita guardarla en su biblioteca, mostrando que todo el reconocimiento se basa en la transformada de Fourier.

## Lo que puede hacer cada perfil

1. **Identificar una canción** con el micrófono.
2. **Guardar la canción** identificada.

Las canciones guardadas forman la playlist general **Guardadas**. Además, el usuario puede **crear playlists personalizadas** con canciones de Guardadas.

## Alcance (v1)

- Login obligatorio con **correo y contraseña** (registro propio; contraseñas hasheadas con bcrypt).
- Captura de audio **solo por micrófono**, desde el navegador.
- FFT radix-2 Cooley-Tukey **propia en TypeScript**, verificada contra una DFT de referencia.
- Fingerprinting por **constellation map** y **hashes combinatorios** (Wang, 2003).
- Matching por **histograma de diferencias de tiempo (offsets)**.
- Catálogo a partir de una **carpeta local de canciones de prueba** (decenas de canciones). El audio nunca sale de la PC: a la base solo van metadatos, portada y fingerprints.
- Base de datos **PostgreSQL en Neon** (plan gratuito).
- Biblioteca por usuario: Guardadas + playlists personalizadas (crear, renombrar, borrar, agregar y quitar canciones).
- Desplegado en **Vercel**, con HTTPS para poder usar el micrófono.
- Diseño basado en las referencias de `specs/08-ui/design-references.md`, tema oscuro.
- Vista explicativa del pipeline (espectrograma, picos, histograma) para la presentación. Prioridad S.

## Fuera de alcance (v1)

- Reproducir las canciones (no se aloja audio).
- Explorar o buscar en el catálogo completo: el usuario solo ve lo que identificó y guardó.
- Subir archivos de audio para reconocer.
- APIs externas de reconocimiento (AudD, ACRCloud).
- Login con proveedores externos (Google, GitHub, Apple).
- Verificación de correo y recuperación de contraseña (requieren un servicio de envío de correos).
- Playlists compartidas o públicas, historial de búsquedas, apps móviles nativas.
- Reconocimiento de humming o covers.

## Criterios de éxito de la demo

| ID | Criterio | Meta |
|---|---|---|
| V-1 | Reconoce una canción del catálogo reproducida por un parlante a ~1 m | >= 8 de 10 intentos |
| V-2 | Tiempo desde que empieza a escuchar hasta el resultado | <= 10 s |
| V-3 | Tasa de falsos positivos con canciones que no están en el catálogo | 0 de 10 intentos |
| V-4 | Precisión con clips de 10 s y ruido blanco a 10 dB SNR (evaluación offline) | >= 90% |
| V-5 | La FFT propia coincide con la DFT de referencia | error máximo < 1e-9 (float64) |
| V-6 | Flujo registro -> identificar -> guardar -> agregar a playlist sin errores | en escritorio y celular |

Las métricas V-4 y V-5 alimentan directamente las tablas y figuras del informe IEEE.

## Usuarios

- **Público de la presentación**: quiere ver que funciona y entender por qué.
- **Profesor**: evalúa el rigor matemático; necesita ver el vínculo entre las ecuaciones y el código.
- **Krlo (desarrollador)**: necesita un proyecto mantenible, modular y presentable en su portafolio.
