# 06 Recognition: tareas

- [ ] **T1. Contratos zod**
  - Cubre: REC-R1, REC-R3.
  - Commit: `feat(recognition): add recognize request and response contracts`

- [ ] **T2. Decisión por histograma**
  - Cubre: REC-R4, REC-R7.
  - Verifica: tests con candidatos sintéticos (ganador claro, empate, score bajo, lista vacía).
  - Commit: `feat(recognition): add offset histogram matching`

- [ ] **T3. Caso de uso con dependencias inyectadas**
  - Cubre: REC-R2, REC-R5, REC-R6, REC-R8.
  - Verifica: tests con repositorio falso.
  - Commit: `feat(recognition): add recognize use case`

- [ ] **T4. Route handler `/api/recognize`**
  - Cubre: REC-R1, REC-R1b, REC-R2, REC-R3, REC-R5.
  - Requiere: `10-auth` T4 (`requireUserForApi`). `saved` devuelve `false` hasta que exista `11-library`.
  - Verifica: con sesión, los hashes de un segmento de 10 s de una canción indexada devuelven la canción correcta; sin sesión, 401.
  - Commit: `feat(recognition): add authenticated recognize api route`

- [ ] **T6. Ruido y SNR**
  - Cubre: EVAL-R2.
  - Verifica: la SNR medida del segmento ruidoso coincide con la pedida (± 0,1 dB).
  - Commit: `feat(eval): add gaussian noise generator with target snr`

- [ ] **T7. Script de evaluación**
  - Cubre: EVAL-R1, EVAL-R3, EVAL-R4, EVAL-R5.
  - Commit: `feat(eval): add offline recognition accuracy benchmark`

- [ ] **T8. Primera evaluación y ajuste de umbrales**
  - Ejecutar, anotar resultados abajo y ajustar `minScore`/`minRatio` si hay falsos positivos.
  - Commit: `perf(recognition): tune match thresholds from eval results`

## Resultados medidos

Pegar aquí la tabla Markdown generada por `npm run eval`.
