# 06 Recognition: tareas

- [x] **T1. Contratos zod**
  - Cubre: REC-R1, REC-R3.
  - Commit: `feat(recognition): add recognize request and response contracts`

- [x] **T2. Decisión por histograma**
  - Cubre: REC-R4, REC-R7.
  - Verifica: tests con candidatos sintéticos (ganador claro, empate, score bajo, lista vacía).
  - Commit: `feat(recognition): add offset histogram matching`

- [x] **T3. Caso de uso con dependencias inyectadas**
  - Cubre: REC-R2, REC-R5, REC-R6, REC-R8.
  - Verifica: tests con repositorio falso.
  - Commit: `feat(recognition): add recognize use case`

- [x] **T4. Route handler `/api/recognize`**
  - Cubre: REC-R1, REC-R1b, REC-R2, REC-R3, REC-R5.
  - Requiere: `10-auth` T4 (`requireUserForApi`). `saved` devuelve `false` hasta que exista `11-library`.
  - Verifica: con sesión, los hashes de un segmento de 10 s de una canción indexada devuelven la canción correcta; sin sesión, 401.
  - Commit: `feat(recognition): add authenticated recognize api route`

- [x] **T6. Ruido y SNR**
  - Cubre: EVAL-R2.
  - Verifica: la SNR medida del segmento ruidoso coincide con la pedida (± 0,1 dB).
  - Commit: `feat(eval): add gaussian noise generator with target snr`

- [x] **T7. Script de evaluación**
  - Cubre: EVAL-R1, EVAL-R3, EVAL-R4, EVAL-R5.
  - Commit: `feat(eval): add offline recognition accuracy benchmark`

- [x] **T9. Condición "sala" en la evaluación**
  - Origen: la prueba con micrófono real del 2026-10-19 falló en 3 de 5 canciones, y el ruido blanco de T6 no lo anticipaba.
  - `scripts/eval/room.ts`: parlante de celular (pasabanda de 250 Hz a 4 kHz), reflexiones a 23, 47 y 89 ms, cola de reverberación y ruido rosa a una SNR exacta. `npm run eval -- --room 15,10,5` (valor por defecto) agrega las columnas "sala".
  - Resultado con FINGERPRINT_VERSION 3 (`npm run eval -- --durations 4,8,12 --trials 12 --snr inf,10,5`, reporte en `reports/eval-2026-10-19-v3.md`): 4 s en sala a 10 dB, 66,7%; 8 s, 100%; 12 s, 100%. 0% de respuestas equivocadas en todas las celdas y 0 falsos positivos en 50 intentos. Consulta en Neon `dev`: p95 de 388 a 428 ms.
  - Commit: `test(eval): add a phone speaker and room condition`

- [x] **T8. Primera evaluación y ajuste de umbrales**
  - Ejecutar, anotar resultados abajo y ajustar `minScore`/`minRatio` si hay falsos positivos.
  - Commit: `docs(recognition): record offline eval results for fingerprint v2` (los umbrales no cambiaron)
  - Resultado: la latencia de la v1 llevó a `03-fingerprint` T8 (FINGERPRINT_VERSION 2). Con la v2 se cumplen los tres criterios de aceptación y REC-R10 en `dev`, con 0 falsos positivos en 50 intentos. Umbrales sin ajustar (τ_abs = 20, ρ = 2): el ruido de canciones no indexadas llega a score 13 y los fallos de la v2 tienen score 13 a 19, así que bajar τ_abs dejaría poco margen.

## Resultados medidos

Pegar aquí la tabla Markdown generada por `npm run eval`.

### Evaluación offline (2026-10-16)

7 canciones indexadas, 20 segmentos por duración (cada uno probado en todas las SNR), semilla 42. FINGERPRINT_VERSION 1, umbrales τ_abs = 20 y ρ = 2.

#### Precisión (canción correcta)

| Duración | ∞ dB | 20 dB | 10 dB | 5 dB | 0 dB |
|---|---|---|---|---|---|
| 3 s | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| 5 s | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| 10 s | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| 15 s | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |

#### Respuestas incorrectas (otra canción)

| Duración | ∞ dB | 20 dB | 10 dB | 5 dB | 0 dB |
|---|---|---|---|---|---|
| 3 s | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| 5 s | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| 10 s | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| 15 s | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |

#### Desfase estimado (aciertos)

- Dentro de 1 frame (46 ms): 94.3% de 400 aciertos.
- Mediana del error: 13.2 ms; p95: 7811.3 ms.
- Aciertos con desfase fuera de 1 frame (partes repetidas de la canción): One More Time - Daft Punk.mp3, El Propio 2 - El Arkeologo.mp3.

#### Tiempo de consulta en la base

| Duración | Hashes (mediana) | p50 | p95 |
|---|---|---|---|
| 3 s | 702 | 465 ms | 657 ms |
| 5 s | 1185 | 575 ms | 702 ms |
| 10 s | 2424 | 841 ms | 1057 ms |
| 15 s | 3781 | 1098 ms | 2090 ms |

#### Falsos positivos (canciones no indexadas, 10 s sin ruido)

Sin datos: falta `data/songs-holdout/` con canciones que no estén indexadas.

### Evaluación offline con FINGERPRINT_VERSION 2 (2026-10-18)

7 canciones indexadas, 20 segmentos por duración (cada uno probado en todas las SNR), semilla 42. FINGERPRINT_VERSION 2, umbrales τ_abs = 20 y ρ = 2.

#### Precisión (canción correcta)

| Duración | ∞ dB | 20 dB | 10 dB | 5 dB | 0 dB |
|---|---|---|---|---|---|
| 3 s | 100.0% | 100.0% | 100.0% | 95.0% | 80.0% |
| 5 s | 100.0% | 100.0% | 100.0% | 100.0% | 95.0% |
| 10 s | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |
| 15 s | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% |

#### Respuestas incorrectas (otra canción)

| Duración | ∞ dB | 20 dB | 10 dB | 5 dB | 0 dB |
|---|---|---|---|---|---|
| 3 s | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| 5 s | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| 10 s | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| 15 s | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |

#### Desfase estimado (aciertos)

- Dentro de 1 frame (46 ms): 91.4% de 394 aciertos.
- Mediana del error: 13.2 ms; p95: 15632.9 ms.
- Aciertos con desfase fuera de 1 frame (partes repetidas de la canción): One More Time - Daft Punk.mp3, El Propio 2 - El Arkeologo.mp3.

#### Tiempo de consulta en la base

| Duración | Hashes (mediana) | p50 | p95 |
|---|---|---|---|
| 3 s | 280 | 364 ms | 396 ms |
| 5 s | 497 | 365 ms | 389 ms |
| 10 s | 950 | 371 ms | 430 ms |
| 15 s | 1494 | 375 ms | 432 ms |

#### Falsos positivos (canciones no indexadas, 10 s sin ruido)

0 falsos positivos en 50 intentos (0.0%), 5 canciones.

Costo medido de la v2: 6 de 400 consultas pasan a `no_match` (3 s a 5 y 0 dB, 5 s a 0 dB), todas con score 13 a 19 y runner-up 0. Aceptado: ninguna condición de los criterios de aceptación se ve afectada.

### Nota: densidad de hashes y latencia

- Con 7 canciones, una consulta de ~3.000 hashes (entre 10 y 15 s) ya ronda 1 a 2 s en la base; REC-R10 pide < 1,5 s en p95 con el catálogo completo, y el tiempo crece con el número de canciones.
- Causa medida: una nota sostenida produce el mismo pico en frames consecutivos y por eso el mismo hash una y otra vez. En una consulta sintética de 30 s hay 6.577 hashes pero solo 748 distintos, y el 85% tiene Δt de 1 a 5 frames. En Neon, cada hash de la consulta coincide con ~400 filas.
- Esa repetición también puede producir falsos positivos entre canciones que comparten una nota sostenida (visto con señales sintéticas). Corregido en `03-fingerprint` T8 (FINGERPRINT_VERSION 2, picos de inicio de nota): ver la evaluación de la v2 arriba.
