# 07 Capture: requisitos

## Historia

Como usuario, quiero tocar un botón, dejar que la app escuche unos segundos y recibir el resultado apenas sea posible, sin que la interfaz se congele.

## Requisitos

| ID | Prioridad | Requisito |
|---|---|---|
| CAP-R1 | M | CUANDO el usuario inicia la escucha, EL SISTEMA DEBE pedir el micrófono con `echoCancellation`, `noiseSuppression` y `autoGainControl` desactivados (distorsionan la música). |
| CAP-R2 | M | MIENTRAS escucha, EL SISTEMA DEBE acumular audio mono con un `AudioWorklet`. |
| CAP-R3 | M | EL SISTEMA DEBE remuestrear el audio a 11.025 Hz con filtro antialiasing antes del fingerprint. |
| CAP-R4 | M | EL SISTEMA DEBE calcular el fingerprint en un Web Worker, nunca en el hilo principal. |
| CAP-R5 | M | EL SISTEMA DEBE hacer intentos de reconocimiento acumulativos a los 4, 8 y 12 s, y detenerse en el primer match. |
| CAP-R6 | M | SI no hay match tras el último intento, ENTONCES EL SISTEMA DEBE terminar en estado `no_match`. |
| CAP-R7 | M | SI el usuario niega el permiso, el navegador no soporta las APIs, no hay HTTPS o la sesión expiró (401), ENTONCES EL SISTEMA DEBE terminar en un estado de error específico. |
| CAP-R8 | M | EL SISTEMA DEBE exponer un hook `useRecognizer()` con una máquina de estados explícita, y la UI DEBE consumir solo ese hook. |
| CAP-R9 | S | MIENTRAS escucha, EL SISTEMA DEBE exponer el nivel de entrada (RMS) y un espectro en vivo calculado con la FFT propia, a ~30 fps. |
| CAP-R10 | S | EL SISTEMA DEBE exponer los datos de depuración del último intento (espectrograma, picos, histograma) para la vista explicativa. |
| CAP-R11 | M | CUANDO la escucha termina o el componente se desmonta, EL SISTEMA DEBE liberar el micrófono, el `AudioContext` y el worker. |
| CAP-R12 | M | El usuario DEBE poder cancelar la escucha en cualquier momento. |

## Criterios de aceptación

- En Chrome y Safari (iOS) sobre HTTPS, el flujo completo funciona y el indicador de micrófono del sistema se apaga al terminar.
- Durante el fingerprint, la animación del nivel de entrada no se congela (el worker hace el trabajo).
- Negar el permiso lleva al estado `error` con `reason: "permission_denied"`.
- Tests unitarios del reductor de la máquina de estados cubren todas las transiciones.
