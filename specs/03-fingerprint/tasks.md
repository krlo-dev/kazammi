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

- [x] **T11. Hop de 256 y picos más densos (FINGERPRINT_VERSION 5)**
  - Cubre: FP-R2, FP-R5.
  - Origen: Krlo pidió que se reconozca cualquier parte de cualquier canción. Con la v4, un barrido de cobertura (cada canción completa en tramos de 4 s cada 2 s, en sala a 10 dB) daba 95,2%: Touch solo 79%, por su intro ambiental y sus pasajes suaves.
  - Barrido en memoria. Cobertura con las 12 canciones indexadas (las 7 de `data/songs/` y las 5 de holdout) en tramos cada 3 s; "ajena" con las 7 indexadas y 100 tramos de cada duración de las 5 de holdout, en sala a 10 dB; τ_abs = 15 y ρ = 2:

    | Variante | Hashes por canción | 4 s, sala 10 dB | 4 s, sala 5 dB | 8 s, sala 5 dB | Peor ajena 4 / 8 / 12 s | Falsos positivos |
    |---|---|---|---|---|---|---|
    | v4 (hop 512, ±10 × ±5, 20/s) | 57.082 | 96,4% | 95,1% | 98,8% | 12 / 9 / 12 | 0/300 |
    | hop 512, ±6 × ±3, 30/s | 85.833 | 98,5% | 97,7% | 99,7% | 15 / 19 / 23 | 2/300 |
    | hop 512, ±6 × ±3, 30/s, fan-out 15 | 128.375 | 99,0% | 98,5% | 99,6% | 20 / 26 / 32 | 13/300 |
    | hop 256, ±6 × ±6, 30/s | 88.184 | 98,5% | 97,9% | 99,6% | 9 / 13 / 15 | 1/300 |
    | hop 256, ±5 × ±5, 40/s | 117.829 | 99,0% | 98,3% | 99,7% | 15 / 18 / 18 | 3/300 |
    | hop 256, ±4 × ±10, 40/s | 118.357 | 98,5% | 97,5% | 99,5% | 9 / 12 / 12 | 0/300 |
    | hop 256, ±8 × ±8, 30/s | 87.755 | 97,7% | 96,2% | 99,2% | 9 / 8 / 10 | 0/300 |
    | **hop 256, ±6 × ±10, 30/s (elegida)** | 88.492 | 98,1% | 96,6% | 99,3% | 7 / 8 / 9 | 0/300 |

  - Decisión: hop 256 con vecindario de ±6 bins × ±10 frames (±65 Hz, ±232 ms), 30 picos por segundo y `maxDeltaFrames` 128, para conservar la zona objetivo de ~3 s. Es la que deja más margen contra falsos positivos (peor ajena 9 con τ_abs = 15) con una cobertura cercana a la máxima. Las variantes con 98,5% a 99% duplicaban el espacio o acercaban la peor ajena al umbral. τ_abs se queda en 15.
  - Cobertura por canción con la v5 (7 canciones, tramos de 4 s cada 2 s, sala a 10 dB): Ayer, California, One More Time y Veridis Quo 100%; El Propio 2 y El Reloj 99%; Touch 87% (antes 79%). Lo que falla de Touch es casi todo la intro ambiental (0:00 a 0:30), que es casi ruido. El percentil 10 del puntaje de los aciertos pasa de 32 a 39 (v4) a 38 a 70.
  - Costo: 93.814 hashes por canción en Neon (+55%), `fingerprints` de 53,6 MB para 7 canciones (5,2% de 1 GB, unas 130 canciones en el plan gratuito). La latencia no cambia (p95 de 392 a 425 ms).
  - No se pudo validar contra grabaciones reales: `data/recordings/` estaba vacía.
  - Verifica: snapshot de FP-R4 actualizado; los tests que asumían hop 512 o `maxDeltaFrames` 64 leen `DEFAULT_PARAMS`; `npm run ingest -- --reset` y `npm run eval` en `dev` (resultados en `06-recognition` T12).
  - Commit: `perf(fingerprint): halve the hop and densify peaks to cover every part of a song`

- [x] **T10. Máximos locales 2D (FINGERPRINT_VERSION 4)**
  - Cubre: FP-R2, FP-R10, FP-R5, FP-R6.
  - Origen: con la v3 la app seguía sin reconocer la mayoría de las canciones desde el celular. De 31 grabaciones reales de `data/recordings/` (2026-10-19 y 2026-10-20), solo 8 tenían un ganador claro. En los pasajes que fallaban, menos de 1 de cada 10 picos de inicio de nota de la grabación coincidía con los del archivo: la reverberación de la sala corre los inicios de nota y el parlante no reproduce las bandas graves ([1, 10) y [10, 20)), así que el umbral relativo de los picos por bandas elegía bandas distintas en la grabación y en el archivo.
  - Barrido en memoria (7 canciones, las 31 grabaciones con puntaje de desfase ±1; "claro" = razón >= 2 y por encima de la peor canción ajena; sintético: 28 tramos por duración en sala a 5 dB; ajenas: 30 tramos de 10 s de 5 canciones fuera del índice, en sala a 10 dB):

    | Variante | Hashes por canción | Grabaciones claras | Sala 5 dB, 4 s / 8 s | Score máx. de una canción ajena |
    |---|---|---|---|---|
    | v3 | 63.484 | 8/31 | 21/28, 27/28 | 15 |
    | máximo local ±10 bins × ±10 frames | 46.044 | 23/31 | 26/28, 28/28 | 6 |
    | ±10 × ±3 frames | 63.509 | 24/31 | 28/28, 28/28 | 14 |
    | **±10 × ±5 frames (elegida)** | 60.652 | 24/31 | 28/28, 28/28 | 8 |
    | ±5 × ±5 / ±15 × ±5 | 63.681 / 56.326 | 24/31 / 25/31 | 28/28 / 27/28 | 10 / 7 |
    | flujo espectral (picos de ataque) | 51.895 a 102.809 | 17 a 21/31 | 14 a 22/28 | 5 a 9 |
    | sin tope de densidad | 87.342 | 24/31 | 27/28, 28/28 | 8 |

  - Decisión: máximo local en ±10 bins × ±5 frames, de 248 Hz a 4 kHz, con piso de -70 dB y tope deslizante de 20 picos por segundo. El tope por bloques fijos de 1 s daba lo mismo, pero dependía del inicio de la señal y rompía FP-R6. Los empates se resuelven con tolerancia de 1e-3 por el primero, para que una nota constante deje un solo pico y el volumen no cambie los hashes (FP-R8).
  - Resultado en Neon `dev` (con `04-catalog` T8 y `06-recognition` T11): 24 de 31 grabaciones reales reconocidas por la ruta de producción, 21 de ellas en el primer intento de 4 s (con la v3, 5 de 31). Las 7 restantes dan 3 a 6 votos contra todas las canciones: 4 son pasajes de Touch (min 6:30 a 7:05) y 2 son de las 00:56 del 2026-10-20, sin coincidencia con ningún archivo indexado.
  - Verifica: tests de `findPeaks` reescritos; snapshot de FP-R4 actualizado; `npm run ingest -- --reset` y `npm run eval` en `dev` (resultados en `06-recognition`).
  - Commit: `perf(fingerprint): pick 2d local-maximum peaks to survive phone speakers and rooms`

## Resultados medidos

| Medida | Valor |
|---|---|
| Densidad de hashes (mezcla sintética de 3 senoidales, 10 s) | v1: 2.100 hashes, ~210 hashes/s. v2: 177 hashes (la mezcla cambia de nota cada 0,5 s, así que casi todo es nota sostenida) |
| Cobertura del módulo | v1: 100% de líneas, 93,75% de ramas. v2: 100% de líneas, 94,44% de ramas |
| Hashes por canción real (7 canciones de `data/songs/`) | v1: 83.525. v2: 31.906 (-62%) |
| Tamaño de `fingerprints` (7 canciones) | v1: 47,5 MB. v2: 18,3 MB |
| Consulta de 15 s en Neon `dev` | v1: 3.781 hashes, p95 2.090 ms. v2: 1.494 hashes, p95 432 ms |
| v3 (fan-out 10) | 63.484 hashes por canción, `fingerprints` de 36,3 MB (7 canciones). Consulta de 12 s en Neon `dev`: 2.354 hashes, p50 370 ms, p95 428 ms |
| v4 (máximos locales 2D) | 60.664 hashes por canción, `fingerprints` de 34,6 MB (7 canciones), ingesta de 14,3 s. Consulta de 12 s en Neon `dev`: 2.272 hashes, p50 374 ms, p95 425 ms |
| v5 (hop 256, picos más densos) | 93.814 hashes por canción, `fingerprints` de 53,6 MB (7 canciones), ingesta de 18,1 s. Consulta de 12 s en Neon `dev`: 3.496 hashes, p50 370 ms, p95 422 ms |
