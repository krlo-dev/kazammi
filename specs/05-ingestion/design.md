# 05 Ingestion: diseño

## Carpeta de canciones de prueba

```
data/                     # en .gitignore
├── songs/                # se indexan (catálogo)
│   ├── Artista - Título.mp3
│   └── ...
└── songs-holdout/        # NO se indexan; sirven para medir falsos positivos (06-recognition)
```

- Tamaño recomendado: entre 20 y 60 canciones variadas en género, más 5 a 10 en `songs-holdout/`.
- El audio vive solo en la PC. A Neon van metadatos, una portada reducida y los fingerprints (que no permiten reconstruir el audio).
- Antes de indexar, revisar las etiquetas con cualquier editor ID3 (p. ej. Mp3tag): título, artista, álbum, año, género y portada.

## Flujo

```
listar archivos -> calcular SHA-256 -> omitir existentes
  -> [pool de concurrencia]
       music-metadata -> etiquetas + portada -> sharp (webp 512)
       ffmpeg -> Float32Array -> fingerprint()
  -> [cola secuencial] insertTrackWithFingerprints (una transacción por canción)
  -> VACUUM ANALYZE + app_meta + resumen
```

## Decodificación

```bash
ffmpeg -v error -i <archivo> -ac 1 -ar 11025 -f f32le pipe:1
```

`decode.ts` lanza el proceso con `child_process.spawn`, concatena los `Buffer` de stdout y crea un `Float32Array` sobre el buffer final (verificando que la longitud en bytes sea múltiplo de 4). La duración se obtiene de `muestras / 11025`.

## CLI

```
npm run ingest -- --dir data/songs --concurrency 4
npm run ingest -- --dry-run
npm run ingest -- --reset    # borra fingerprints y los regenera; conserva tracks, Guardadas y playlists
```

Parseo con `node:util` `parseArgs`. Ejecutado con `tsx`. La CLI carga `.env.local` y después `.env` con `process.loadEnvFile` (misma precedencia que Next.js; el dry run no los necesita). ffmpeg se busca en el `PATH` o en `FFMPEG_PATH`.

Código de salida: `0` sin errores, `2` si algún archivo falló (el resto se indexa igual), `1` si se detuvo (versión distinta, carpeta inexistente).

## Escritura

- Decodificación, portada y fingerprint son concurrentes; **la escritura es secuencial** para no saturar el pool de Neon.
- Cada canción va en su propia transacción: si falla, no quedan fingerprints huérfanos.

## Archivos

| Archivo | Contenido |
|---|---|
| `scripts/ingest/index.ts` | Punto de entrada y CLI |
| `scripts/ingest/ingest.ts` | `runIngest(options, deps)`: el flujo completo, con dependencias inyectadas para probarlo sobre PGlite |
| `scripts/ingest/scan.ts` | Listado de archivos y SHA-256 |
| `scripts/ingest/decode.ts` | ffmpeg -> `Float32Array` |
| `scripts/ingest/metadata.ts` | Etiquetas, deducción por nombre de archivo, portada |
| `scripts/ingest/pool.ts` | Pool de concurrencia simple |
| `scripts/ingest/report.ts` | Progreso y resumen |

## Dependencias nuevas

`music-metadata`, `sharp` (como `devDependencies`: la ingesta nunca corre en el despliegue). ffmpeg se instala en el sistema (`winget install --id Gyan.FFmpeg` en Windows).

## Estimación de tamaño

`filas × 85 B + bytes de portadas`. Los 85 B por fila (con índice) se midieron en Neon tras la primera ingesta y reemplazan los ~72 B de `04-catalog`. Límite: 80% de 1 GB.

## Ingesta en producción

La misma CLI, apuntando `DATABASE_URL` a la rama `main` de Neon. Con decenas de canciones tarda minutos; no hace falta importar archivos ni pasos extra.
