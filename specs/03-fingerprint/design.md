# 03 Fingerprint: diseño

## API pública (`src/modules/fingerprint/index.ts`)

```ts
export interface FingerprintParams {
  sampleRate: 11025;
  windowSize: 1024;
  hopSize: 512;
  bandEdges: readonly number[];   // [1, 10, 20, 40, 80, 160, 512]
  peakAlpha: number;              // 1.0
  silenceThreshold: number;       // 1.0: magnitud mínima absoluta tras normalizar
  peakContinuityBins: number;     // 1: B, un pico que sigue a otro de su banda a ±B bins se descarta (v2)
  targetZone: {
    minDeltaFrames: number;       // 1
    maxDeltaFrames: number;       // 64
    maxDeltaBins: number;         // 128
    fanOut: number;               // 5
  };
}

export const DEFAULT_PARAMS: FingerprintParams;
export const FINGERPRINT_VERSION: number; // 1 inicial; 2 con picos de inicio de nota

export interface Peak { frame: number; bin: number; magnitude: number }

export interface Fingerprint {
  /** hashes[i] y anchorFrames[i] forman una pareja. */
  hashes: Uint32Array;
  anchorFrames: Uint32Array;
}

export interface FingerprintDebug {
  spectrogram: Spectrogram; // de @/modules/dsp
  peaks: Peak[];
}

export function fingerprint(
  pcm: Float32Array,
  options?: { params?: FingerprintParams; debug?: false },
): Fingerprint;
export function fingerprint(
  pcm: Float32Array,
  options: { params?: FingerprintParams; debug: true },
): Fingerprint & { debug: FingerprintDebug };

export function encodeHash(anchorBin: number, pointBin: number, deltaFrames: number): number;
export function decodeHash(hash: number): { anchorBin: number; pointBin: number; deltaFrames: number };
```

## Pipeline

```
pcm -> normalize (pico a 1.0) -> stft (dsp) -> findPeaks -> buildHashes -> Fingerprint
```

### `findPeaks(spec, params)`
1. Para cada frame m: para cada banda [lo, hi), encontrar el bin de máxima magnitud.
2. Calcular el promedio de los máximos de las bandas del frame.
3. Conservar los máximos con magnitud >= `peakAlpha · promedio` y >= `silenceThreshold`.
4. Inicio de nota (v2): descartar el pico de la banda b en el frame m si el frame m-1 tuvo un pico (que pasó los umbrales del paso 3) en la misma banda con `|bin_m - bin_{m-1}| <= peakContinuityBins`. Así una nota sostenida aporta un solo pico, el de su inicio, y una nota nueva en la misma banda aporta otro. El paso no compara magnitudes entre frames, por lo que no depende del volumen ni del redondeo.
5. Devolver los picos ordenados por (frame, bin).

Costo: solo se recuerdan los picos del frame anterior (6 valores), sigue siendo lineal. En el primer frame de una consulta no hay frame anterior, así que una nota que ya sonaba aparece como inicio; el matching lo tolera porque vota con la mayoría de los hashes.

### `buildHashes(peaks, params)`
1. Para cada pico ancla i, recorrer los picos j > i (están ordenados por frame).
2. Parar cuando `frame_j - frame_i > maxDeltaFrames`.
3. Aceptar j si `Δt >= minDeltaFrames` y `|bin_j - bin_i| <= maxDeltaBins`.
4. Emitir hasta `fanOut` pares por ancla.
5. `hash = ((anchorBin << 23) | (pointBin << 14) | deltaFrames) >>> 0`.

`>>> 0` es obligatorio: los operadores de bits de JavaScript trabajan en int32 con signo y el resultado debe ser uint32.

### Umbral de silencio

`silenceThreshold = 1.0` se aplica a la magnitud del espectrograma de la señal ya normalizada. Una senoidal a escala completa con ventana de Hann y N = 1024 tiene magnitud cercana a N/4 = 256, así que 1.0 queda unos 48 dB por debajo: los pasajes suaves siguen generando picos y el silencio digital no. Se recalibra con audio real en `05-ingestion` (si cambia, sube `FINGERPRINT_VERSION`).

## Versionado

`FINGERPRINT_VERSION` vive junto a `DEFAULT_PARAMS`. Regla: **cualquier** cambio en `DEFAULT_PARAMS` o en el algoritmo incrementa la versión. La base de datos guarda la versión con la que se indexó cada track y la API rechaza consultas con una versión distinta (ver `06-recognition`).

## Archivos

| Archivo | Contenido |
|---|---|
| `params.ts` | `FingerprintParams`, `DEFAULT_PARAMS`, `FINGERPRINT_VERSION` |
| `normalize.ts` | Normalización de pico |
| `peaks.ts` | `findPeaks` |
| `hash.ts` | `encodeHash`, `decodeHash`, `buildHashes` |
| `fingerprint.ts` | Orquestación del pipeline |
| `__tests__/` | Tests de cada archivo + snapshot determinista |

## Decisiones

| Decisión | Alternativa | Motivo | Requisitos |
|---|---|---|---|
| Picos por bandas | Filtro de máximo 2D (vecindario) | Más simple, determinista y lineal en costo; buena distribución en frecuencia | FP-R2 |
| Picos de inicio de nota (continuidad a ±B bins) | Máximo temporal por banda en ±W frames; subir `minDeltaFrames`; deduplicar en SQL | Medido en v1: una nota sostenida repite el mismo pico frame tras frame (30 s de audio: 6.577 hashes, solo 748 distintos, 85% con Δt de 1 a 5). Con el máximo temporal (W = 3), dentro de una nota estable el frame ganador depende del desfase de la consulta y el score cae a la mitad que con inicio de nota (consultas de 3 s: 29 a 111 contra 75 a 268), con una reducción de filas parecida. Subir `minDeltaFrames` deja los anclas repetidos; deduplicar en SQL no reduce las filas indexadas | FP-R10 |
| Hash empaquetado en uint32 | String `"k1|k2|dt"` o SHA-1 | Columna numérica (`bigint` en Postgres): índice más pequeño y búsquedas más rápidas que con texto | FP-R3 |
| Normalización de pico | Normalización RMS | Simple; el umbral relativo α ya compensa la mayor parte del volumen | FP-R8 |
| Parámetros como constantes versionadas | Configurables en runtime | Evita que cliente y BD usen parámetros distintos | FP-R5 |

## Riesgos

- **Normalización vs. umbral absoluto**: con normalización de pico, un pico de ruido fuerte (un golpe al micrófono) reduce la escala del resto. Si aparece en las pruebas con micrófono, cambiar a normalización RMS y subir la versión.
- **Densidad de hashes**: afecta el tamaño de la BD (ver `math-model.md` sección 9). Se ajusta con `peakAlpha` y `fanOut` después de medir en `05-ingestion`.
- **Menos hashes por consulta (v2)**: la supresión baja la cantidad de hashes y con ella el score de los aciertos. Si la precisión con 3 s o 0 dB cae, se compensa con `fanOut` (otra versión) o con `minScore` en `06-recognition` (no cambia la versión).
