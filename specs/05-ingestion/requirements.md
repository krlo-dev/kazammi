# 05 Ingestion: requisitos

## Historia

Como desarrollador, quiero un comando que tome la carpeta de canciones de prueba y llene la base de datos con metadatos, portadas y fingerprints, para tener el catálogo listo sin trabajo manual.

## Requisitos

| ID | Prioridad | Requisito |
|---|---|---|
| ING-R1 | M | EL SISTEMA DEBE proveer `npm run ingest` con las opciones `--dir` (por defecto `data/songs`), `--limit`, `--dry-run` y `--concurrency`. La base destino es la de `DATABASE_URL`. |
| ING-R2 | M | EL SISTEMA DEBE aceptar `.mp3`, `.m4a`, `.flac`, `.wav` y `.ogg`, y decodificarlos con ffmpeg a PCM mono `f32le` a 11.025 Hz. |
| ING-R3 | M | EL SISTEMA DEBE leer título, artista, álbum, género, año y portada de las etiquetas del archivo (`music-metadata`). |
| ING-R4 | M | SI faltan título o artista en las etiquetas, ENTONCES EL SISTEMA DEBE deducirlos del nombre de archivo con el formato `Artista - Título.ext`; si tampoco es posible, omite el archivo y lo reporta. |
| ING-R5 | M | EL SISTEMA DEBE convertir la portada a webp de 512 x 512 px con `sharp`. SI no hay portada, ENTONCES la canción queda con `has_cover = false` y la UI muestra un placeholder. |
| ING-R6 | M | EL SISTEMA DEBE generar los fingerprints con el módulo `fingerprint` (el mismo código que usa el navegador). |
| ING-R7 | M | EL SISTEMA DEBE ser idempotente: SI el SHA-256 del archivo ya existe en la base, ENTONCES lo omite. |
| ING-R8 | M | SI un archivo no se puede decodificar o dura menos de 10 s, ENTONCES EL SISTEMA DEBE reportarlo y continuar. |
| ING-R9 | M | EL SISTEMA DEBE mostrar progreso y un resumen: canciones nuevas, omitidas, con error, hashes promedio por canción y tamaño de `fingerprints`. |
| ING-R10 | M | Al terminar, EL SISTEMA DEBE ejecutar `VACUUM ANALYZE fingerprints` y guardar `FINGERPRINT_VERSION` en `app_meta`. |
| ING-R11 | M | SI la base ya tiene una `fingerprint_version` distinta a la del código, ENTONCES EL SISTEMA DEBE detenerse y pedir `--reset`. `--reset` borra **solo los fingerprints** y los regenera, conservando las filas de `tracks` (identificadas por SHA-256) para no perder las Guardadas ni las playlists de los usuarios. |
| ING-R12 | S | `--dry-run` DEBE procesar todo sin escribir en la base y mostrar el tamaño estimado. |
| ING-R13 | M | La ingesta NUNCA DEBE ejecutarse dentro de la app desplegada, y el audio NUNCA DEBE subirse al repositorio. |

## Criterios de aceptación

- Con 10 canciones en `data/songs/`, `npm run ingest` indexa 10 canciones con portada (si la tienen) en la rama `dev` de Neon.
- Volver a ejecutar el comando no inserta nada nuevo.
- `--dry-run` sobre la carpeta completa estima el tamaño, y la estimación queda por debajo del 80% del 1 GB del plan gratuito.
