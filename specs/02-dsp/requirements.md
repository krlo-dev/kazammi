# 02 DSP: requisitos

## Historias

- Como sistema de reconocimiento, necesito transformar audio del dominio del tiempo al de la frecuencia de forma rápida y exacta, para construir el espectrograma.
- Como evaluador del proyecto, quiero ver la FFT implementada a mano y verificada contra la definición de la DFT, para comprobar el dominio del modelo matemático.

Referencia matemática: secciones 2 a 5 de [`math-model.md`](../00-foundation/math-model.md).

## Requisitos

| ID | Prioridad | Requisito |
|---|---|---|
| DSP-R1 | M | EL SISTEMA DEBE calcular la FFT radix-2 de Cooley-Tukey de forma iterativa, in-place, sobre partes real e imaginaria en `Float64Array`. |
| DSP-R2 | M | EL SISTEMA DEBE proveer una DFT directa O(N²) usada como referencia en los tests. |
| DSP-R3 | M | SI el tamaño de entrada no es potencia de 2 o es menor que 2, ENTONCES EL SISTEMA DEBE lanzar un error descriptivo. |
| DSP-R4 | M | EL SISTEMA DEBE precalcular twiddles y la tabla de bit-reversal una sola vez por tamaño N (plan reutilizable). |
| DSP-R5 | M | EL SISTEMA DEBE generar la ventana de Hann de tamaño N. |
| DSP-R6 | M | EL SISTEMA DEBE calcular la STFT de una señal mono con tamaño de ventana y salto configurables, devolviendo un espectrograma de magnitudes para los bins 0 a N/2. |
| DSP-R7 | M | EL SISTEMA DEBE convertir magnitudes a decibeles y bins/frames a Hz/segundos. |
| DSP-R8 | S | EL SISTEMA DEBE proveer la IFFT, de modo que IFFT(FFT(x)) recupere x. |
| DSP-R9 | M | Ninguna función del módulo DEBE depender de APIs del navegador, de Node ni de otros módulos. |
| DSP-R10 | S | EL SISTEMA DEBE calcular la STFT de 10 s de audio a 11.025 Hz en menos de 50 ms en Node (máquina de desarrollo). |

## Criterios de aceptación

| Requisito | Prueba |
|---|---|
| DSP-R1, R2 | Para N en {2, 4, 8, ..., 4096} y señales aleatorias con semilla fija, el error absoluto máximo entre FFT y DFT es < 1e-9. |
| DSP-R1 | Impulso unitario: espectro plano de magnitud 1. Señal constante c: X[0] = N·c y el resto ≈ 0. |
| DSP-R1 | Senoidal con exactamente k ciclos en N muestras: magnitud N/2 en los bins k y N-k, ≈ 0 en el resto. |
| DSP-R1 | Teorema de Parseval: Σ\|x[n]\|² = (1/N)·Σ\|X[k]\|² con error relativo < 1e-12. |
| DSP-R3 | `fft` con N = 1000 lanza `RangeError`. |
| DSP-R5 | `hann(N)[0] = hann(N)[N-1] = 0` y el máximo es 1 en el centro (N impar). |
| DSP-R6 | Senoidal de 1.000 Hz a 11.025 Hz con N = 1024: en cada frame el bin máximo es round(1000·1024/11025) = 93. |
| DSP-R6 | Señal de L muestras produce floor((L - N)/H) + 1 frames. |
| DSP-R8 | Error de ida y vuelta < 1e-12. |
| DSP-R10 | Benchmark con `vitest bench`. |
