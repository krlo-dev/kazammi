# 05 Ingestion: tareas

- [x] **T0. Preparar canciones (manual, Krlo)**
  - Copiar las canciones de prueba a `data/songs/` y unas 5 a 10 más a `data/songs-holdout/`.
  - Revisar etiquetas y portadas; instalar ffmpeg y verificar con `ffmpeg -version`.
  - Sin commit (los datos están en `.gitignore`).
  - Estado: 7 canciones en `data/songs/` y ffmpeg 9.0.2. Pendiente: `data/songs-holdout/` (se necesita en `06-recognition`).

- [x] **T1. Escaneo y decodificación**
  - Cubre: ING-R2, ING-R8.
  - Verifica: una canción de 3:30 produce ~2.315.250 muestras.
  - Commit: `feat(ingest): add file scanner and ffmpeg pcm decoder`

- [x] **T2. Metadatos y portadas**
  - Cubre: ING-R3, ING-R4, ING-R5.
  - Commit: `feat(ingest): read id3 tags and normalize cover art`

- [x] **T3. CLI, pool y escritura**
  - Cubre: ING-R1, ING-R6, ING-R7, ING-R9, ING-R10, ING-R11, ING-R13.
  - Commit: `feat(ingest): add local songs ingestion cli`

- [x] **T4. Dry run**
  - Cubre: ING-R12.
  - Commit: `feat(ingest): add dry run with size estimate`

- [x] **T5. Primera ingesta en `dev`**
  - Ejecutar y anotar resultados abajo. Si la estimación no cabe en el plan gratuito, ajustar `peakAlpha`/`fanOut` (sube `FINGERPRINT_VERSION`).
  - Commit (si hubo ajuste): `perf(fingerprint): tune peak density for catalog size`
  - Estado: sin ajuste. El tamaño cabe de sobra; la densidad de hashes afecta el tiempo de la consulta (ver resultados) y se decide en `06-recognition`.

## Resultados medidos

| Medida | Valor |
|---|---|
| Canciones indexadas | 7 (todas con portada), rama `dev` |
| Hashes promedio por canción | 83.525 (~250 hashes/s de audio; el modelo suponía ~45.000 por canción) |
| Tamaño de `fingerprints` | 47,5 MB (584.673 filas, ~85 B por fila). Estimación para 60 canciones: ~430 MB, 42% del plan |
| Tiempo total de ingesta | 16,8 s (2,8 s del dry run sin red); segunda ejecución: 7 omitidas en 3,1 s |
| Archivos con error | 0 |
| Con FINGERPRINT_VERSION 2 (`--reset`, 2026-10-18) | 31.906 hashes por canción en promedio, `fingerprints` de 18,3 MB; 7 regeneradas en 13,2 s. Estimación para 60 canciones: ~160 MB, 16% del plan |
