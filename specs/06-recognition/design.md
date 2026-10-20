# 06 Recognition: diseño

## Contrato de la API

### `POST /api/recognize`

Request:

```json
{
  "fingerprintVersion": 1,
  "hashes": [[3221225472, 0], [3238002692, 1]],
  "debug": false
}
```

Response 200, con match:

```json
{
  "status": "match",
  "track": {
    "id": 42, "title": "...", "artist": "...", "album": "...", "genre": "Rock", "year": 2015,
    "durationSec": 213.4, "coverUrl": "/api/tracks/42/cover"
  },
  "saved": false,
  "confidence": 0.87,
  "offsetSeconds": 12.4,
  "score": 156,
  "runnerUpScore": 9,
  "timings": { "dbMs": 210, "totalMs": 240 },
  "debug": { "histogram": [[268, 156], [269, 12]] }
}
```

Response 200, sin match:

```json
{ "status": "no_match", "score": 7, "timings": { "dbMs": 180, "totalMs": 195 } }
```

Errores: `400` (validación), `401` (sin sesión), `409` (versión incompatible), `500` (error interno, sin detalles al cliente). Cuerpo de error: `{ "error": "invalid_request" | "unauthorized" | "version_mismatch" | "internal_error", "message"?: string }`. Todas las respuestas llevan `Cache-Control: no-store`.

### Composición en el route handler

`recognition` no conoce usuarios ni biblioteca. El route handler compone:

```ts
const user = await requireUserForApi();          // @/modules/auth, 401 si no hay sesión
const result = await recognize(body, deps);      // @/modules/recognition
const saved = result.status === "match"
  ? await library.isSaved(user.id, result.track.id)  // @/modules/library
  : false;
```

Esquema zod compartido en `src/shared/contracts/recognize.ts`, usado por el route handler y por el cliente de `capture`.

## Lógica de decisión (`match.ts`, pura)

```ts
export interface MatchParams { minScore: number; minRatio: number } // 15, 2 (T11)

export interface MatchDecision {
  status: "match" | "no_match";
  trackId?: number;
  delta?: number;
  score: number;
  runnerUpScore: number;
  confidence: number;
}

export function decide(candidates: Candidate[], params: MatchParams): MatchDecision;
```

**Confianza**: `confidence = (1 - runnerUp / score) · min(1, score / (2 · minScore))`. Combina qué tan separado está el ganador del segundo y qué tan alto es su score absoluto. Es una heurística para la UI, no una probabilidad; el informe lo debe aclarar.

**Desfase en segundos**: `offsetSeconds = delta · hopSize / sampleRate`.

## Caso de uso (`recognize.ts`)

```ts
export function createRecognizer(deps: {
  catalog: CatalogRepository;
  params?: MatchParams;      // DEFAULT_MATCH_PARAMS = { minScore: 15, minRatio: 2 }
  now?: () => number;        // reloj inyectable para los tests
}): (input: ParsedRecognizeRequest) => Promise<RecognitionResult>;
```

`createRecognizer` guarda en su closure la versión indexada (TTL de 60 s, porque una reingesta puede cambiarla); el route handler mantiene un recognizer por instancia. `RecognitionResult` es la respuesta sin `saved`: `recognition` no conoce usuarios, el campo lo agrega el route handler. Una versión distinta lanza `VersionMismatchError` (409).

1. Validar versión contra `catalog.getStats().fingerprintVersion` (cacheado en memoria del proceso).
2. `catalog.findCandidates(hashes, times, 10)`.
3. `decide(candidates, params)`.
4. Si hay match, `catalog.getTracksByIds([trackId])` y se arma `coverUrl` si `hasCover`. Con `debug: true`, en paralelo, `catalog.getOffsetHistogram(trackId, hashes, times, 200)`: los 200 desfases más votados del ganador, ordenados por desfase (método nuevo del catálogo).
5. Medir tiempos con `performance.now()`.

Las dependencias se inyectan para poder testear el caso de uso con un repositorio falso.

## Evaluación offline (`scripts/eval/`)

```
para cada D en duraciones, cada SNR en niveles:
  para i en 1..N:
    track = muestra aleatoria (semilla)
    pcm = decode(mp3 del track)
    inicio = aleatorio en [0, len - D]
    segmento = pcm[inicio : inicio + D]
    segmento += ruido gaussiano con potencia P_señal / 10^(SNR/10)
    resultado = recognize(fingerprint(segmento))
    acierto = resultado.trackId == track.id
    errorOffset = |resultado.offsetSeconds - inicio / fs|
```

- Generador gaussiano: Box-Muller sobre el PRNG con semilla de los tests de `dsp`.
- El archivo de cada canción se ubica con `tracks.source_path` dentro de `data/songs/`.
- Para falsos positivos se usan las canciones de `data/songs-holdout/`.
- Llama a `recognize` directamente (sin HTTP ni sesión) con el repositorio sobre la rama `dev` de Neon.

Salida de ejemplo para el informe:

| Duración | ∞ dB | 20 dB | 10 dB | 5 dB | 0 dB |
|---|---|---|---|---|---|
| 5 s | | | | | |
| 10 s | | | | | |

## Archivos

| Archivo | Contenido |
|---|---|
| `src/modules/recognition/match.ts` | `decide` |
| `src/modules/recognition/recognize.ts` | Caso de uso |
| `src/modules/recognition/index.ts` | API pública |
| `src/shared/contracts/recognize.ts` | Esquemas zod de request y response |
| `src/app/api/recognize/route.ts` | Route handler delgado (auth + recognize + isSaved) |
| `scripts/eval/index.ts` | CLI: `npm run eval -- [--durations 3,5,10,15] [--snr inf,20,10,5,0] [--trials 20] [--fp-trials 50] [--seed 42]` |
| `scripts/eval/eval.ts` | `runEval()`: el bucle de la evaluación, con `recognize` inyectado |
| `scripts/eval/report.ts` | CSV por consulta y tabla Markdown para el informe |
| `scripts/eval/noise.ts` | PRNG, Box-Muller, ruido gaussiano a una SNR exacta |

Notas de la evaluación:

- Cada segmento se prueba en todas las SNR (comparación pareada): las diferencias entre columnas se deben al ruido, no a segmentos distintos.
- El ruido se reescala a su potencia exacta, así la SNR medida coincide con la pedida aunque el segmento sea corto.
- La canción de cada archivo se busca por SHA-256 (`findTrackIdBySha256`), igual que en la ingesta.
- Se escriben `reports/eval-<fecha>.csv` (ignorado por git) y `reports/eval-<fecha>.md`.
