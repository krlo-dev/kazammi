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

Errores: `400` (validación), `401` (sin sesión), `409` (versión incompatible), `500` (error interno, sin detalles al cliente).

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
export interface MatchParams { minScore: number; minRatio: number } // 20, 2

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
export async function recognize(
  input: RecognizeRequest,
  deps: { catalog: CatalogRepository; params: MatchParams },
): Promise<RecognizeResponse>;
```

1. Validar versión contra `catalog.getStats().fingerprintVersion` (cacheado en memoria del proceso).
2. `catalog.findCandidates(hashes, 10)`.
3. `decide(candidates, params)`.
4. Si hay match, `catalog.getTracksByIds([trackId])` y se arma `coverUrl` si `hasCover`.
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
| `scripts/eval/index.ts` | Evaluación offline |
| `scripts/eval/noise.ts` | Ruido gaussiano y SNR |
