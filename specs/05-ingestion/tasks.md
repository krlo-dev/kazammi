# 05 Ingestion: tareas

- [ ] **T0. Preparar canciones (manual, Krlo)**
  - Copiar las canciones de prueba a `data/songs/` y unas 5 a 10 más a `data/songs-holdout/`.
  - Revisar etiquetas y portadas; instalar ffmpeg y verificar con `ffmpeg -version`.
  - Sin commit (los datos están en `.gitignore`).

- [ ] **T1. Escaneo y decodificación**
  - Cubre: ING-R2, ING-R8.
  - Verifica: una canción de 3:30 produce ~2.315.250 muestras.
  - Commit: `feat(ingest): add file scanner and ffmpeg pcm decoder`

- [ ] **T2. Metadatos y portadas**
  - Cubre: ING-R3, ING-R4, ING-R5.
  - Commit: `feat(ingest): read id3 tags and normalize cover art`

- [ ] **T3. CLI, pool y escritura**
  - Cubre: ING-R1, ING-R6, ING-R7, ING-R9, ING-R10, ING-R11, ING-R13.
  - Commit: `feat(ingest): add local songs ingestion cli`

- [ ] **T4. Dry run**
  - Cubre: ING-R12.
  - Commit: `feat(ingest): add dry run with size estimate`

- [ ] **T5. Primera ingesta en `dev`**
  - Ejecutar y anotar resultados abajo. Si la estimación no cabe en el plan gratuito, ajustar `peakAlpha`/`fanOut` (sube `FINGERPRINT_VERSION`).
  - Commit (si hubo ajuste): `perf(fingerprint): tune peak density for catalog size`

## Resultados medidos

| Medida | Valor |
|---|---|
| Canciones indexadas | pendiente |
| Hashes promedio por canción | pendiente |
| Tamaño de `fingerprints` | pendiente |
| Tiempo total de ingesta | pendiente |
| Archivos con error | pendiente |
