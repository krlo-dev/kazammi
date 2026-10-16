# 02 DSP: diseño

## API pública (`src/modules/dsp/index.ts`)

```ts
/** Plan reutilizable para un tamaño N fijo. */
export interface FftPlan {
  readonly size: number;
  /** Transforma in-place. re.length === im.length === size. */
  forward(re: Float64Array, im: Float64Array): void;
  /** Inversa in-place, incluye la normalización 1/N. */
  inverse(re: Float64Array, im: Float64Array): void;
}

export function createFftPlan(size: number): FftPlan;

/** DFT directa O(N^2). Solo para tests y para la vista explicativa. */
export function dft(re: Float64Array, im: Float64Array): { re: Float64Array; im: Float64Array };

export function hann(size: number): Float64Array;

export interface StftParams {
  windowSize: number; // potencia de 2
  hopSize: number;
}

export interface Spectrogram {
  readonly frames: number;
  readonly bins: number;        // windowSize / 2 + 1
  readonly sampleRate: number;
  readonly windowSize: number;
  readonly hopSize: number;
  /** Magnitudes lineales, row-major: data[frame * bins + bin]. */
  readonly data: Float32Array;
}

export function stft(signal: Float32Array, sampleRate: number, params: StftParams): Spectrogram;

export function toDecibels(magnitude: number, epsilon?: number): number;
export function binToHz(bin: number, sampleRate: number, windowSize: number): number;
export function frameToSeconds(frame: number, sampleRate: number, hopSize: number): number;
```

## Algoritmo de `forward`

```
1. Para i en 0..N-1: si i < rev[i], intercambiar (re[i], re[rev[i]]) e (im[i], im[rev[i]])
2. Para size = 2, 4, ..., N:
     half = size / 2
     step = N / size            // índice en la tabla de twiddles
     Para start = 0, size, 2·size, ... < N:
       Para j = 0..half-1:
         wr = cosTable[j·step];  wi = -sinTable[j·step]
         a = start + j;  b = a + half
         tr = wr·re[b] - wi·im[b]
         ti = wr·im[b] + wi·re[b]
         re[b] = re[a] - tr;  im[b] = im[a] - ti
         re[a] += tr;         im[a] += ti
```

- `rev`: `Uint32Array` con la inversión de bits de cada índice, calculada al crear el plan.
- `cosTable`, `sinTable`: `Float64Array` de tamaño N/2 con `cos(2πk/N)` y `sin(2πk/N)`.
- `inverse`: conjugar `im`, aplicar `forward`, conjugar de nuevo y dividir entre N.

## STFT

- Reutiliza un único plan y dos buffers `re`/`im` para todos los frames (sin asignaciones dentro del bucle).
- Por frame: copiar `signal[m·H .. m·H + N)` multiplicado por la ventana en `re`, poner `im` en 0, `forward`, guardar `sqrt(re² + im²)` para bins 0..N/2.
- Si la señal es más corta que N, devuelve un espectrograma de 0 frames.

## Archivos

| Archivo | Contenido |
|---|---|
| `fft.ts` | `createFftPlan`, bit-reversal, twiddles |
| `dft.ts` | DFT de referencia |
| `window.ts` | `hann` |
| `stft.ts` | `stft`, conversiones |
| `__tests__/fft.test.ts` | Comparación con DFT, casos analíticos, Parseval, errores |
| `__tests__/stft.test.ts` | Senoidal, número de frames |
| `__tests__/fft.bench.ts` | Benchmark |
| `__tests__/helpers.ts` | Generador aleatorio con semilla (mulberry32), generador de senoidales |

## Decisiones

| Decisión | Alternativa | Motivo | Requisitos |
|---|---|---|---|
| `Float64Array` interno, `Float32Array` en el espectrograma | Todo `Float32` | Precisión para los tests de 1e-9; el espectrograma en 32 bits ocupa la mitad | DSP-R1, R6 |
| FFT compleja de N puntos para señal real | FFT real empaquetada de N/2 | Más simple de explicar en el informe; el rendimiento sobra | DSP-R1 |
| Plan precalculado | Calcular twiddles en cada llamada | Evita miles de `Math.cos` por frame | DSP-R4, R10 |
