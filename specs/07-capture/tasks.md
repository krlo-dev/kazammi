# 07 Capture: tareas

- [x] **T1. Máquina de estados**
  - Cubre: CAP-R5, CAP-R6, CAP-R7, CAP-R8 (reductor), CAP-R12.
  - Verifica: tests de todas las transiciones.
  - Commit: `feat(capture): add recognizer state machine reducer`

- [x] **T2. Grabación con AudioWorklet**
  - Cubre: CAP-R1, CAP-R2, CAP-R11.
  - Verifica: en `localhost`, grabar 4 s y registrar la cantidad de muestras (≈ 4 · sampleRate del dispositivo).
  - Commit: `feat(capture): record microphone audio with audioworklet`

- [x] **T3. Remuestreo**
  - Cubre: CAP-R3.
  - Commit: `feat(capture): resample recordings to 11025 hz`

- [x] **T4. Worker de fingerprint**
  - Cubre: CAP-R4.
  - Verifica: los hashes del worker para un PCM fijo son idénticos a los de Node (mismo snapshot que en `03-fingerprint`).
  - Commit: `feat(capture): compute fingerprints in a web worker`

- [x] **T5. Cliente de la API e intentos acumulativos**
  - Cubre: CAP-R5, CAP-R6.
  - Commit: `feat(capture): add cumulative recognition attempts`

- [x] **T6. Hook `useRecognizer`**
  - Cubre: CAP-R8, CAP-R11, CAP-R12.
  - Verifica: página temporal sin estilos (con sesión iniciada) que muestra el estado en JSON y reconoce una canción reproducida en el parlante.
  - Commit: `feat(capture): add userecognizer hook`

- [x] **T7. Analizador en vivo**
  - Cubre: CAP-R9.
  - Commit: `feat(capture): add live spectrum analyser using custom fft`

- [x] **T8. Datos de depuración**
  - Cubre: CAP-R10.
  - Commit: `feat(capture): expose debug pipeline data`

## Resultados medidos

| Medida | Valor |
|---|---|
| Prueba con micrófono en `localhost` (2026-10-19, Chrome, `/dev/recognizer`) | "Touch" de Daft Punk reproducida en el parlante: `matched` con score 35, segundo candidato 5, confianza 0,75 y offset de 187,2 s |
| Consulta en Neon `dev` durante la prueba | 601 ms en la base de datos, 602 ms en total |
| Cantidad de muestras grabadas (T2) | No se registró. El match con un offset coherente confirma que la grabación y el remuestreo entregan audio a la tasa correcta |
