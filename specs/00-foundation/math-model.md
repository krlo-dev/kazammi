# Modelo matemático

Este documento es la referencia matemática del proyecto. Cada sección indica el módulo y el archivo que la implementa, para que el informe IEEE pueda enlazar ecuaciones con código.

## 1. Muestreo

Una señal de audio continua $x(t)$ se muestrea con periodo $T = 1/f_s$:

$$x[n] = x(nT), \quad n = 0, 1, 2, \dots$$

Por el teorema de Nyquist-Shannon, solo se representan sin aliasing las frecuencias $f < f_s/2$.

**Decisión**: trabajar a $f_s = 11.025$ Hz (un cuarto de 44.100 Hz). La frecuencia máxima representable es 5.512,5 Hz, rango donde está la mayor parte de la energía tonal de la música, y el costo de cómputo baja 4 veces. Antes de bajar la tasa se aplica un filtro pasa bajos (lo hace `ffmpeg` en la ingesta y `OfflineAudioContext` en el navegador).

Implementa: `capture/resample.ts`, `scripts/ingest/decode.ts`.

## 2. Transformada de Fourier

La transformada de Fourier descompone una señal en sus componentes de frecuencia:

$$X(f) = \int_{-\infty}^{\infty} x(t)\, e^{-j 2\pi f t}\, dt$$

Para señales discretas y finitas de $N$ muestras se usa la **Transformada Discreta de Fourier (DFT)**:

$$X[k] = \sum_{n=0}^{N-1} x[n]\, e^{-j \frac{2\pi}{N} k n}, \quad k = 0, \dots, N-1$$

- El bin $k$ corresponde a la frecuencia $f_k = k \cdot f_s / N$.
- La resolución en frecuencia es $\Delta f = f_s / N$.
- Para señales reales se cumple la simetría conjugada $X[N-k] = \overline{X[k]}$, así que solo se usan los bins $k = 0, \dots, N/2$.

Calcular la DFT directamente cuesta $O(N^2)$ multiplicaciones complejas.

Implementa: `dsp/dft.ts` (solo como referencia para tests).

## 3. FFT radix-2 de Cooley-Tukey

Si $N$ es potencia de 2, la DFT se divide en las muestras pares $E[k]$ e impares $O[k]$, cada una una DFT de tamaño $N/2$:

$$X[k] = E[k] + W_N^k\, O[k]$$
$$X[k + N/2] = E[k] - W_N^k\, O[k]$$

donde $W_N = e^{-j 2\pi / N}$ es el *twiddle factor*. Aplicando la división recursivamente se obtienen $\log_2 N$ etapas de $N/2$ "mariposas", para un costo de $O(N \log_2 N)$.

| $N$ | DFT ($N^2$) | FFT ($\frac{N}{2}\log_2 N$) | Aceleración |
|---|---|---|---|
| 256 | 65.536 | 1.024 | 64x |
| 1.024 | 1.048.576 | 5.120 | 205x |
| 4.096 | 16.777.216 | 24.576 | 683x |

**Implementación iterativa** (sin recursión, sin crear arreglos en cada llamada):

1. Permutación por inversión de bits (*bit-reversal*) del arreglo de entrada.
2. Para cada etapa $s = 1, \dots, \log_2 N$, con tamaño de bloque $m = 2^s$, aplicar las mariposas usando twiddles precalculados.
3. Partes real e imaginaria en `Float64Array` separados (estructura SoA).

Implementa: `dsp/fft.ts`.

## 4. Ventaneo y fuga espectral

Tomar un fragmento finito equivale a multiplicar por una ventana rectangular, lo que "esparce" la energía de una frecuencia a bins vecinos (fuga espectral). Se usa la **ventana de Hann**:

$$w[n] = 0{,}5\left(1 - \cos\frac{2\pi n}{N-1}\right), \quad n = 0, \dots, N-1$$

Implementa: `dsp/window.ts`.

## 5. Transformada de Fourier de Tiempo Corto (STFT) y espectrograma

La música cambia en el tiempo, así que se calcula la FFT sobre ventanas deslizantes con salto $H$ (*hop*):

$$X[m, k] = \sum_{n=0}^{N-1} x[n + mH]\, w[n]\, e^{-j \frac{2\pi}{N} k n}$$

El **espectrograma** es la magnitud en decibeles:

$$S_{dB}[m, k] = 20 \log_{10}\left(|X[m, k]| + \varepsilon\right)$$

Cada frame $m$ representa $H / f_s$ segundos. Existe un compromiso tiempo-frecuencia (principio de incertidumbre de Gabor): una ventana larga da buena resolución en frecuencia y mala en tiempo, y viceversa.

**Parámetros elegidos**: $N = 1024$, $H = 256$ (75% de solapamiento, desde la versión 5 del fingerprint; antes $H = 512$).
- $\Delta f = 11025 / 1024 \approx 10{,}77$ Hz por bin.
- Duración de la ventana $\approx 92{,}9$ ms; duración de un frame $\approx 23{,}2$ ms.

Implementa: `dsp/stft.ts`.

## 6. Constellation map (detección de picos)

Se buscan los puntos del espectrograma con más energía, porque son los que sobreviven al ruido, la compresión y la ecualización. El resultado es un conjunto de puntos tiempo-frecuencia:

$$\mathcal{P} = \{(m_i, k_i)\}$$

**Máximos locales 2D** (v4):

1. Un punto $(m, k)$ es candidato si $|X_m[k]|$ es el máximo de su vecindario $\{(m', k') : |m' - m| \le 10,\ |k' - k| \le 6\}$, es decir ±232 ms y ±65 Hz.
2. Solo se buscan picos en $23 \le k < 372$ (248 Hz a 4 kHz), la banda que reproduce el parlante de un celular.
3. Se descartan los puntos más de 70 dB por debajo del bin más fuerte del espectrograma (silencio).
4. Empates: si dos valores de un vecindario difieren en menos de $10^{-3}$ relativo, se conserva el primero. Sin este paso, una nota sostenida y constante genera el mismo pico en cada frame y, con él, los mismos hashes repetidos.
5. Densidad: un pico sobrevive si tiene menos de 30 picos más fuertes a ±0,5 s.

Implementa: `fingerprint/peaks.ts`.

## 7. Hashes combinatorios

Un pico aislado tiene poca información (~9 bits de frecuencia) y se repite en muchas canciones. Por eso se combinan **pares de picos**. Para cada pico ancla $a = (m_a, k_a)$ se define una **zona objetivo**:

$$Z(a) = \{(m, k) \in \mathcal{P} : m_a + \Delta_{min} \le m \le m_a + \Delta_{max},\ |k - k_a| \le K\}$$

y se toman hasta $F$ puntos (*fan-out*). Para cada par $(a, p)$ se genera un hash de 32 bits:

$$h = (k_a \ll 23)\ |\ (k_p \ll 14)\ |\ (m_p - m_a)$$

| Campo | Bits | Rango |
|---|---|---|
| $k_a$ (frecuencia del ancla) | 9 | 0 a 511 |
| $k_p$ (frecuencia del punto) | 9 | 0 a 511 |
| $\Delta m = m_p - m_a$ | 14 | 0 a 16.383 frames |

Se almacena la tupla $(h, \text{trackId}, m_a)$. El hash es invariante al instante absoluto: solo depende de frecuencias y de la diferencia de tiempo.

Parámetros: $\Delta_{min} = 1$, $\Delta_{max} = 128$ frames (~3 s con $H = 256$; 64 frames hasta la versión 4), $K = 128$ bins, $F = 10$ (desde la versión 3; las versiones 1 y 2 usaban $F = 5$).

Implementa: `fingerprint/hash.ts`. El hash es un entero de 32 bits sin signo; como PostgreSQL no tiene enteros sin signo, la columna es `bigint`.

## 8. Matching por histograma de offsets

Para cada hash de la consulta $(h, m_q)$ se buscan en la base todas las entradas $(h, \text{track}, m_{db})$ y se calcula:

$$\delta = m_{db} - m_q$$

Si la grabación pertenece a una canción, sus hashes coinciden con los de esa canción **con el mismo desfase** $\delta$ (el instante en que empezó la grabación dentro de la canción). Las coincidencias aleatorias producen $\delta$ dispersos. Entonces:

$$H_{track}(\delta) = \#\{\text{coincidencias de } track \text{ con desfase } \delta\}$$
$$\text{score}(track) = \max_{\delta} H_{track}(\delta)$$

**Decisión**:
- Ganador: el track con mayor score.
- Se acepta si $\text{score}_1 \ge \tau_{abs}$ y $\text{score}_1 / \text{score}_2 \ge \rho$ (inicial: $\tau_{abs} = 20$, $\rho = 2$).
- Posición en la canción: $\delta^* \cdot H / f_s$ segundos.

Implementa: `recognition/match.ts` y la consulta SQL de `catalog/fingerprint-repository.ts` (el histograma $H_{track}(\delta)$ se calcula con un `GROUP BY track_id, delta`).

## 9. Estimación del tamaño de la base

$$\text{filas} \approx \text{tracks} \times \text{frames por track} \times \text{picos por frame} \times F$$

Para una canción completa de 3,5 min: $210 \cdot 11025 / 512 \approx 4.522$ frames. Con ~2 picos útiles por frame y $F = 5$: ~45.000 filas por canción.

En PostgreSQL cada fila ocupa ~72 B contando el índice cubriente (medido: 4 M filas = 289 MB).

| Canciones | Filas aprox. | Tamaño aprox. |
|---|---|---|
| 30 | 1,4 M | ~100 MB |
| 100 | 4,5 M | ~330 MB |
| 250 | 11 M | ~0,8 GB (límite práctico del plan gratuito de Neon) |

Estos valores se medirán en la ingesta real (tarea en `05-ingestion`); si hiciera falta se ajustan $\alpha$ y $F$.

## Referencias base para el informe

1. A. Wang, "An Industrial-Strength Audio Search Algorithm," *Proc. ISMIR*, 2003.
2. J. W. Cooley y J. W. Tukey, "An Algorithm for the Machine Calculation of Complex Fourier Series," *Math. Comput.*, vol. 19, pp. 297-301, 1965.
3. A. V. Oppenheim y R. W. Schafer, *Discrete-Time Signal Processing*, 3.ª ed. Pearson, 2010.
4. F. J. Harris, "On the Use of Windows for Harmonic Analysis with the Discrete Fourier Transform," *Proc. IEEE*, vol. 66, no. 1, 1978.
