# 07 Capture: tareas

- [ ] **T1. Máquina de estados**
  - Cubre: CAP-R5, CAP-R6, CAP-R7, CAP-R8 (reductor), CAP-R12.
  - Verifica: tests de todas las transiciones.
  - Commit: `feat(capture): add recognizer state machine reducer`

- [ ] **T2. Grabación con AudioWorklet**
  - Cubre: CAP-R1, CAP-R2, CAP-R11.
  - Verifica: en `localhost`, grabar 4 s y registrar la cantidad de muestras (≈ 4 · sampleRate del dispositivo).
  - Commit: `feat(capture): record microphone audio with audioworklet`

- [ ] **T3. Remuestreo**
  - Cubre: CAP-R3.
  - Commit: `feat(capture): resample recordings to 11025 hz`

- [ ] **T4. Worker de fingerprint**
  - Cubre: CAP-R4.
  - Verifica: los hashes del worker para un PCM fijo son idénticos a los de Node (mismo snapshot que en `03-fingerprint`).
  - Commit: `feat(capture): compute fingerprints in a web worker`

- [ ] **T5. Cliente de la API e intentos acumulativos**
  - Cubre: CAP-R5, CAP-R6.
  - Commit: `feat(capture): add cumulative recognition attempts`

- [ ] **T6. Hook `useRecognizer`**
  - Cubre: CAP-R8, CAP-R11, CAP-R12.
  - Verifica: página temporal sin estilos (con sesión iniciada) que muestra el estado en JSON y reconoce una canción reproducida en el parlante.
  - Commit: `feat(capture): add userecognizer hook`

- [ ] **T7. Analizador en vivo**
  - Cubre: CAP-R9.
  - Commit: `feat(capture): add live spectrum analyser using custom fft`

- [ ] **T8. Datos de depuración**
  - Cubre: CAP-R10.
  - Commit: `feat(capture): expose debug pipeline data`
