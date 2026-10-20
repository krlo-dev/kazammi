# 03 Fingerprint: diseño

## API pública (`src/modules/fingerprint/index.ts`)

```ts
export interface FingerprintParams {
  sampleRate: 11025;
  windowSize: 1024;
  hopSize: 256;                   // 23 ms por frame (v5)
  neighborhood: { bins: number; frames: number }; // ±6 bins, ±10 frames (v5)
  minBin: number;                 // 23 (248 Hz)
  maxBin: number;                 // 372 (4 kHz), exclusivo
  peakFloorDb: number;            // -70: piso relativo al bin más fuerte del espectrograma
  maxPeaksPerSecond: number;      // 30: picos más fuertes permitidos a ±0,5 s
  targetZone: {
    minDeltaFrames: number;       // 1
    maxDeltaFrames: number;       // 128 (~3 s)
    maxDeltaBins: number;         // 128
    fanOut: number;               // 10 (v3)
  };
}

export const DEFAULT_PARAMS: FingerprintParams;
export const FINGERPRINT_VERSION: number; // 1 inicial; 2 inicio de nota; 3 fan-out 10; 4 máximos locales 2D; 5 hop 256 y picos más densos

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

### `findPeaks(spec, params)` (v4, parámetros de la v5)
1. Piso: `loudest · 10^(peakFloorDb / 20)`, con `loudest` el bin más fuerte del espectrograma. La comparación es estricta, así que el silencio digital (`loudest = 0`) no da picos.
2. Filtro de máximo separable: primero a lo largo de la frecuencia (±`neighborhood.bins`, en todos los bins), luego a lo largo del tiempo (±`neighborhood.frames`, solo en [minBin, maxBin)).
3. Candidato: un bin de [minBin, maxBin) sobre el piso cuyo valor, con tolerancia relativa de 1e-3, es el máximo de su vecindario.
4. Empates: se descarta el candidato que empata (dentro de la tolerancia) con otro anterior de su vecindario. Una nota perfectamente constante deja un solo pico, el del primer frame, y el redondeo de punto flotante no decide cuál gana.
5. Densidad: un candidato sobrevive si tiene menos de `maxPeaksPerSecond` candidatos más fuertes a ±0,5 s (`round(sampleRate / hopSize / 2)` frames). La ventana está centrada en cada pico, así que el resultado no depende de dónde empieza la señal (FP-R6).
6. Devolver los picos ordenados por (frame, bin).

Costo: el filtro de máximo es O(frames · bins · vecindario), unos 2 a 3 s por canción de 5 min en Node; una consulta de 12 s tarda milisegundos.

### `buildHashes(peaks, params)`
1. Para cada pico ancla i, recorrer los picos j > i (están ordenados por frame).
2. Parar cuando `frame_j - frame_i > maxDeltaFrames`.
3. Aceptar j si `Δt >= minDeltaFrames` y `|bin_j - bin_i| <= maxDeltaBins`.
4. Emitir hasta `fanOut` pares por ancla.
5. `hash = ((anchorBin << 23) | (pointBin << 14) | deltaFrames) >>> 0`.

`>>> 0` es obligatorio: los operadores de bits de JavaScript trabajan en int32 con signo y el resultado debe ser uint32.

### Piso de silencio

`peakFloorDb = -70` es relativo al bin más fuerte del propio espectrograma (de la canción en la ingesta, del clip en la consulta). Con la normalización de pico, equivale a un umbral absoluto: los pasajes suaves siguen dando picos y el silencio digital no.

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
| Hop de 256 y picos más densos (v5) | Hop de 512 con más picos por segundo | Con la misma densidad, el doble de resolución temporal reparte los votos al azar entre el doble de desfases: la peor canción ajena queda en 9 votos contra 15 a 23 con hop 512 y una densidad parecida, y la cobertura sube de 95,2% a 98,1% (ver `tasks.md` T11) | FP-R2 |
| Máximos locales 2D (v4) | Picos por bandas con inicio de nota (v2 y v3) | Medido con 31 grabaciones reales de celular: los picos de inicio de nota no sobreviven al parlante y la sala (8 de 31 reconocibles); el máximo local en ±10 bins × ±5 frames, limitado a 248 Hz a 4 kHz, reconoce 24 de 31 con el ruido de fondo en 3 a 8 votos (ver `tasks.md` T10) | FP-R2 |
| Primer valor de un empate (v4); antes, picos de inicio de nota (v2) | Máximo temporal por banda en ±W frames; subir `minDeltaFrames`; deduplicar en SQL | Medido en v1: una nota sostenida repite el mismo pico frame tras frame (30 s de audio: 6.577 hashes, solo 748 distintos, 85% con Δt de 1 a 5). Con el máximo temporal (W = 3), dentro de una nota estable el frame ganador depende del desfase de la consulta y el score cae a la mitad que con inicio de nota (consultas de 3 s: 29 a 111 contra 75 a 268), con una reducción de filas parecida. Subir `minDeltaFrames` deja los anclas repetidos; deduplicar en SQL no reduce las filas indexadas | FP-R10 |
| Hash empaquetado en uint32 | String `"k1|k2|dt"` o SHA-1 | Columna numérica (`bigint` en Postgres): índice más pequeño y búsquedas más rápidas que con texto | FP-R3 |
| Normalización de pico | Normalización RMS | Simple; el umbral relativo α ya compensa la mayor parte del volumen | FP-R8 |
| Parámetros como constantes versionadas | Configurables en runtime | Evita que cliente y BD usen parámetros distintos | FP-R5 |

## Riesgos

- **Normalización vs. umbral absoluto**: con normalización de pico, un pico de ruido fuerte (un golpe al micrófono) reduce la escala del resto. Si aparece en las pruebas con micrófono, cambiar a normalización RMS y subir la versión.
- **Densidad de hashes**: afecta el tamaño de la BD (ver `math-model.md` sección 9). Se ajusta con `maxPeaksPerSecond` y `fanOut`.
- **Menos hashes por consulta (v2)**: la supresión baja la cantidad de hashes y con ella el score de los aciertos. Si la precisión con 3 s o 0 dB cae, se compensa con `fanOut` (otra versión) o con `minScore` en `06-recognition` (no cambia la versión).
- **Fan-out 10 (v3)**: la prueba con micrófono real mostró que la v2 no aguanta el parlante y la sala. Con la condición "sala" de la evaluación se compararon fan-out 10 y 15, el filtro de inicio de nota relajado o apagado y más picos por banda (ver `tasks.md` T9). Fan-out 10 es la única mejora grande que deja margen contra falsos positivos: la peor canción ajena queda en 11, con el umbral en 20. Fan-out 15 y la combinación con más picos quedaban a 2 puntos o menos del umbral, y la v1 (sin filtro) daba falsos positivos.
