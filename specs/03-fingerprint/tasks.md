# 03 Fingerprint: tareas

- [x] **T1. Parámetros y versión**
  - Cubre: FP-R5.
  - Commit: `feat(fingerprint): add versioned fingerprint parameters`

- [x] **T2. Codificación de hashes**
  - Cubre: FP-R3 (encode/decode).
  - Verifica: ida y vuelta con valores límite; resultado siempre >= 0.
  - Commit: `feat(fingerprint): add 32-bit hash encoding and decoding`

- [x] **T3. Normalización**
  - Cubre: FP-R8.
  - Commit: `feat(fingerprint): add peak amplitude normalization`

- [x] **T4. Detección de picos**
  - Cubre: FP-R2.
  - Verifica: silencio sin picos; senoidales con picos en los bins esperados; ruido con densidad acotada.
  - Commit: `feat(fingerprint): add band-based spectral peak picking`

- [x] **T5. Hashes combinatorios**
  - Cubre: FP-R3.
  - Verifica: fan-out respetado; Δt y Δbin dentro de la zona objetivo.
  - Commit: `feat(fingerprint): add combinatorial hashing with target zone`

- [x] **T6. Pipeline completo y modo debug**
  - Cubre: FP-R1, FP-R7.
  - Commit: `feat(fingerprint): add fingerprint pipeline with debug output`

- [x] **T7. Propiedades de invariancia**
  - Cubre: FP-R4, FP-R6, FP-R8.
  - Verifica: snapshot determinista, desplazamiento temporal, escala de amplitud.
  - Commit: `test(fingerprint): add determinism and invariance tests`

- [x] **T8. Picos de inicio de nota (FINGERPRINT_VERSION 2)**
  - Cubre: FP-R10, FP-R5.
  - Origen: evaluación de `06-recognition` T8 (latencia de REC-R10 y hashes repetidos).
  - Verifica: senoidal constante con un solo pico; salto de frecuencia con pico nuevo; los tests de invariancia (FP-R4, R6, R8) siguen en verde, con el snapshot de FP-R4 actualizado; `npm run ingest -- --reset` y `npm run eval` cumplen los criterios de aceptación de `06-recognition`. La caída de precisión medida en 3 s con SNR <= 5 dB y en 5 s a 0 dB se aceptó como costo de la v2 (decisión de Krlo, 2026-10-18).
  - Commit: `perf(fingerprint): keep only note-onset peaks to drop repeated hashes`

- [x] **T9. Fan-out 10 (FINGERPRINT_VERSION 3)**
  - Cubre: FP-R3, FP-R5.
  - Origen: prueba con micrófono real del 2026-10-19. El Reloj, El Propio 2 y Veridis Quo no se reconocían desde un parlante; con audio limpio las 7 canciones sí. La condición "sala" de la evaluación (`06-recognition` T9) reprodujo la caída: la v2 reconocía 25% de los tramos de 4 s en sala.
  - Barrido (7 canciones en PGlite, 8 tramos por celda, sala a 10 dB; falsos positivos con 2 canciones fuera del índice):

    | Variante | Hashes por canción | 4 s en sala | 8 s en sala | Falsos positivos | Score máx. de una canción ajena |
    |---|---|---|---|---|---|
    | v2 (fan-out 5) | 31.906 | 25% | 75% | 0/32 | 8 |
    | fan-out 10 | 63.484 | 66% | 91% | 0/32 | 11 |
    | fan-out 15 | 94.720 | 86% | 96% | 0/32 | 18 |
    | filtro de inicio a ±0 bins | 41.886 | 59% | 89% | 0/32 | 14 |
    | sin filtro de inicio (v1) | 83.525 | 88% | 100% | 3/32 | 186 |
    | `peakAlpha` 0,8 | 39.853 | 45% | 86% | 0/32 | 9 |
    | fan-out 10 + `peakAlpha` 0,8 | 79.303 | 79% | 96% | 0/32 | 20 |

  - Decisión: fan-out 10, la única mejora grande con margen contra falsos positivos (la peor canción ajena queda en 11 con el umbral en 20).
  - Verifica: snapshot de FP-R4 actualizado; `npm run ingest -- --reset` y `npm run eval` en `dev` (resultados en `06-recognition`).
  - Commit: `perf(fingerprint): raise fan-out to 10 to survive speakers and rooms`

## Resultados medidos

| Medida | Valor |
|---|---|
| Densidad de hashes (mezcla sintética de 3 senoidales, 10 s) | v1: 2.100 hashes, ~210 hashes/s. v2: 177 hashes (la mezcla cambia de nota cada 0,5 s, así que casi todo es nota sostenida) |
| Cobertura del módulo | v1: 100% de líneas, 93,75% de ramas. v2: 100% de líneas, 94,44% de ramas |
| Hashes por canción real (7 canciones de `data/songs/`) | v1: 83.525. v2: 31.906 (-62%) |
| Tamaño de `fingerprints` (7 canciones) | v1: 47,5 MB. v2: 18,3 MB |
| Consulta de 15 s en Neon `dev` | v1: 3.781 hashes, p95 2.090 ms. v2: 1.494 hashes, p95 432 ms |
| v3 (fan-out 10) | 63.484 hashes por canción, `fingerprints` de 36,3 MB (7 canciones). Consulta de 12 s en Neon `dev`: 2.354 hashes, p50 370 ms, p95 428 ms |
