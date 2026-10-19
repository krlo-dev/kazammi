# 03 Fingerprint: requisitos

## Historia

Como sistema de reconocimiento, necesito convertir cualquier fragmento de audio en un conjunto compacto de hashes robustos al ruido, para poder compararlo contra miles de canciones en milisegundos.

Referencia matemática: secciones 6 y 7 de [`math-model.md`](../00-foundation/math-model.md).

## Requisitos

| ID | Prioridad | Requisito |
|---|---|---|
| FP-R1 | M | EL SISTEMA DEBE recibir PCM mono `Float32Array` a 11.025 Hz y producir una lista de hashes `(hash: uint32, t: frame del ancla)`. |
| FP-R2 | M | EL SISTEMA DEBE detectar picos espectrales por bandas logarítmicas con umbral relativo (coeficiente α) y umbral absoluto de silencio. |
| FP-R10 | M | SI en el frame anterior la misma banda tuvo un pico a ±B bins, ENTONCES EL SISTEMA DEBE descartar el pico (solo se conserva el inicio de cada nota), de modo que una nota sostenida no repita el mismo pico en frames consecutivos. |
| FP-R3 | M | EL SISTEMA DEBE generar hashes combinatorios de 32 bits (9 bits k_ancla, 9 bits k_punto, 14 bits Δt) usando una zona objetivo con fan-out F. |
| FP-R4 | M | EL SISTEMA DEBE ser determinista: la misma entrada produce exactamente los mismos hashes en el navegador y en Node. |
| FP-R5 | M | EL SISTEMA DEBE centralizar todos los parámetros en un objeto `FingerprintParams` y exponer `FINGERPRINT_VERSION`, que cambia cada vez que cambia algún parámetro. |
| FP-R6 | M | CUANDO una señal se desplaza un número entero de frames d, los hashes de la región común DEBEN mantenerse y sus tiempos de ancla DEBEN desplazarse exactamente d. |
| FP-R7 | S | EL SISTEMA DEBE poder devolver resultados intermedios (espectrograma y picos) para la vista explicativa, sin costo cuando no se piden. |
| FP-R8 | S | EL SISTEMA DEBE normalizar la amplitud de la señal antes de procesarla, de modo que el volumen de grabación no cambie los picos detectados. |
| FP-R9 | M | El módulo solo DEBE depender de `dsp` y `shared`. |

## Criterios de aceptación

| Requisito | Prueba |
|---|---|
| FP-R1, R3 | Una mezcla sintética de 3 senoidales con cambios cada 0,5 s produce hashes; cada hash decodificado devuelve frecuencias y Δt dentro de rango. |
| FP-R3 | `encodeHash` y `decodeHash` son inversas para todos los valores límite (0 y máximos de cada campo). |
| FP-R4 | Snapshot test: el hash SHA-256 del arreglo de hashes de una señal fija no cambia entre ejecuciones. |
| FP-R6 | Señal sintética desplazada `d · hopSize` muestras: en la región común, mismos valores hash con tiempos desplazados en d. |
| FP-R8 | La misma señal multiplicada por 0,1 produce los mismos hashes. |
| FP-R2 | Silencio (ceros) produce 0 picos; ruido blanco produce menos de 6 picos por frame. |
| FP-R10 | Una senoidal constante de 5 s produce un único pico en su banda (el del primer frame); una senoidal cuya frecuencia salta más de B bins produce un pico nuevo en el frame del salto; los tests de volumen (FP-R8) siguen pasando. |
