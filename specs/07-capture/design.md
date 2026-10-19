# 07 Capture: diseño

## Máquina de estados

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> requesting: start()
    requesting --> listening: permiso concedido
    requesting --> error: denegado / no soportado
    listening --> listening: intento sin match (4 s, 8 s)
    listening --> matched: intento con match
    listening --> no_match: intento de 12 s sin match
    listening --> error: red / versión incompatible
    listening --> idle: cancel()
    matched --> idle: reset()
    no_match --> idle: reset()
    error --> idle: reset()
```

`listening` incluye un subcampo `attempt: 0 | 1 | 2 | 3` y `processing: boolean` para que la UI muestre el progreso.

## API pública (`src/modules/capture/index.ts`)

```ts
export type RecognizerState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "listening"; elapsedMs: number; attempt: number; processing: boolean }
  | { status: "matched"; result: MatchResult }
  | { status: "no_match"; bestScore: number }
  | { status: "error"; reason: "permission_denied" | "unsupported" | "insecure_context" | "network" | "unauthorized" | "version_mismatch" | "unknown" };

export interface RecognizerLive {
  level: number;              // RMS 0..1
  spectrum: Float32Array;     // magnitudes en dB normalizadas 0..1, 128 bandas
}

export interface RecognizerDebug {
  waveform: Float32Array;     // PCM 11.025 Hz reducido a ~2.000 puntos (min/max por bloque)
  spectrogram: Spectrogram;
  peaks: Peak[];
  histogram?: Array<[delta: number, count: number]>;
}

export function useRecognizer(): {
  state: RecognizerState;
  live: RecognizerLive | null;     // se actualiza por requestAnimationFrame
  debug: RecognizerDebug | null;
  start(): void;
  cancel(): void;
  reset(): void;
};
```

## Piezas

| Pieza | Hilo | Responsabilidad |
|---|---|---|
| `public/worklets/recorder.js` | Audio | `AudioWorkletProcessor` que envía bloques de 128 muestras al hilo principal por `port.postMessage` |
| `recorder.ts` | Principal | `getUserMedia`, `AudioContext`, conexión del worklet, buffer acumulado |
| `resample.ts` | Principal | `OfflineAudioContext(1, length·11025/sr, 11025)` para remuestrear con el filtro del navegador |
| `fingerprint.worker.ts` | Worker | Recibe PCM 11.025 Hz, llama a `fingerprint()`, devuelve hashes (transferibles) y debug opcional |
| `api-client.ts` | Principal | `POST /api/recognize` con el contrato zod compartido (la cookie de sesión viaja sola por ser mismo origen); 401 -> `unauthorized` |
| `live-analyser.ts` | Principal | FFT propia de 1024 puntos sobre las últimas muestras, agrupada en 128 bandas logarítmicas |
| `machine.ts` | Principal | Reductor puro de la máquina de estados (testeable sin navegador) |
| `use-recognizer.ts` | Principal | Hook que conecta todo |

- El worklet va en `public/` como JavaScript plano porque `audioWorklet.addModule()` necesita una URL y así se evita depender del bundler.
- El worker se crea con `new Worker(new URL("./fingerprint.worker.ts", import.meta.url), { type: "module" })`, patrón soportado por Next.js. Se verifica en la tarea correspondiente.
- Los `Uint32Array` de hashes se devuelven como transferibles para no copiarlos.

## Intentos acumulativos

```
t = 4 s  -> fingerprint(audio[0:4 s])  -> API -> ¿match? fin
t = 8 s  -> fingerprint(audio[0:8 s])  -> API -> ¿match? fin
t = 12 s -> fingerprint(audio[0:12 s]) -> API -> match | no_match
```

Si un intento sigue en curso cuando llega el siguiente, se espera a que termine (no se lanzan intentos en paralelo).

## Diferencia con la ingesta

La ingesta remuestrea con ffmpeg y el navegador con `OfflineAudioContext`. Los filtros no son idénticos, pero los picos espectrales dominantes no cambian. El fingerprint es robusto a esa diferencia por diseño; se comprueba en la prueba con micrófono real (criterio V-1).

## Decisiones de implementación

- **Silencio**: si un intento no produce hashes, cuenta como `no_match` con `score: 0` sin llamar a la API (el contrato exige al menos un hash).
- **`bestScore`**: es el `score` del último intento. Como los intentos son acumulativos, el último cubre todo el audio.
- **Micrófono**: se libera apenas arranca el intento de 12 s, sin esperar la respuesta de la API, para que el indicador del sistema se apague antes.
- **Errores**: `getUserMedia` con `NotAllowedError` o `SecurityError` da `permission_denied`; sin micrófono (`NotFoundError`, `NotReadableError`) da `unsupported`. En la API, 401 da `unauthorized`, 409 da `version_mismatch`, 5xx o fallo de red da `network`, y cualquier otra respuesta da `unknown`.
- **Depuración**: todos los intentos piden `debug` al worker y a la API; el hook expone el del último intento terminado.
- **Worker con Turbopack**: `new Worker(new URL("./fingerprint.worker.ts", import.meta.url), { type: "module" })` funciona en `next build`: Turbopack lo carga con su `turbopack-worker` y empaqueta `dsp` y `fingerprint` en el chunk del worker. El cuerpo del worker vive en `worker-protocol.ts` para probarlo en Node con el mismo snapshot de `03-fingerprint`.
- **Grabación**: el `AudioContext` se crea antes del primer `await` para que iOS Safari lo deje sonar dentro del gesto del usuario. El worklet se conecta al destino a través de una ganancia 0, porque algunos navegadores solo procesan nodos que llegan al destino.
- **Página temporal**: `/dev/recognizer` (grupo `(app)`, con sesión) muestra el estado en JSON para verificar T2, T3 y T6. Se borra cuando llegue la pantalla de identificar de `08-ui`.

### Cambios pedidos por `08-ui` (2026-10-19)

- `RecognizerDebug` suma `hashExample`: el ancla más fuerte con fan-out completo, su zona objetivo y sus hashes, armados igual que `buildHashes` (`pickHashExample`, con test).
- `useLastRecognition()` expone la última escucha terminada (datos de depuración y match) a otras rutas de la misma pestaña, para `/how-it-works`. Se pierde al recargar.
- `start()` también funciona desde `matched`, `no_match` y `error`: reinicia y empieza en un solo toque ("Intentar de nuevo", UI-R15).
- La página temporal `/dev/recognizer` se borró: la reemplaza la pantalla de identificar.
