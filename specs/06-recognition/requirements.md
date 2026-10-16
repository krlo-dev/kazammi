# 06 Recognition: requisitos

## Historias

- Como usuario, quiero enviar lo que grabó el micrófono y recibir la canción, su artista y en qué segundo de la canción estaba.
- Como autor del informe, quiero medir la precisión del sistema bajo ruido y con distintas duraciones de grabación, para presentar resultados cuantitativos.

Referencia matemática: sección 8 de [`math-model.md`](../00-foundation/math-model.md).

## Requisitos: matching y API

| ID | Prioridad | Requisito |
|---|---|---|
| REC-R1 | M | EL SISTEMA DEBE exponer `POST /api/recognize` que reciba `{ fingerprintVersion, hashes: [[hash, t], ...] }` validado con zod. |
| REC-R1b | M | SI la petición no trae una sesión válida, ENTONCES EL SISTEMA DEBE responder 401 sin consultar la base de fingerprints. |
| REC-R2 | M | SI `fingerprintVersion` no coincide con la versión indexada, ENTONCES EL SISTEMA DEBE responder 409 con un mensaje claro. |
| REC-R3 | M | SI la petición tiene 0 hashes o más de 20.000, ENTONCES EL SISTEMA DEBE responder 400. |
| REC-R4 | M | EL SISTEMA DEBE elegir el track con mayor conteo en un mismo desfase y aceptarlo solo si `score₁ >= τ_abs` y `score₁ / score₂ >= ρ`. |
| REC-R5 | M | CUANDO hay match, EL SISTEMA DEBE responder la canción (con URL de portada), la confianza (0 a 1), el desfase en segundos, si el usuario ya la tiene en Guardadas y los tiempos de procesamiento. |
| REC-R6 | M | CUANDO no hay match, EL SISTEMA DEBE responder `status: "no_match"` con el mejor score observado (útil para depurar). |
| REC-R7 | M | La lógica de decisión DEBE vivir en `recognition/match.ts` como función pura, independiente de la base de datos. |
| REC-R8 | S | EL SISTEMA DEBE devolver, si se pide `debug: true`, el histograma de desfases del track ganador para la vista explicativa. |
| REC-R10 | M | El tiempo de respuesta del servidor para 3.000 hashes contra el catálogo completo DEBE ser < 1,5 s en producción (p95, con Neon despierto). |

## Requisitos: evaluación offline

| ID | Prioridad | Requisito |
|---|---|---|
| EVAL-R1 | M | EL SISTEMA DEBE proveer `npm run eval` que tome canciones de `data/songs/` (semilla fija), corte segmentos de duración D en posiciones aleatorias y los reconozca contra la rama `dev` de Neon. |
| EVAL-R2 | M | EL SISTEMA DEBE agregar ruido blanco gaussiano a SNR configurables (∞, 20, 10, 5, 0 dB). |
| EVAL-R3 | M | EL SISTEMA DEBE medir precisión, tasa de falsos positivos (con segmentos de `data/songs-holdout/`, no indexadas) y error del desfase estimado. |
| EVAL-R4 | M | EL SISTEMA DEBE exportar los resultados a `reports/eval-<fecha>.csv` y una tabla Markdown lista para el informe. |
| EVAL-R5 | S | EL SISTEMA DEBE barrer duraciones D en {3, 5, 10, 15} s. |

## Criterios de aceptación

- Segmentos de 10 s sin ruido: precisión >= 98%.
- Segmentos de 10 s a 10 dB SNR: precisión >= 90% (criterio V-4 de la visión).
- Segmentos de canciones no indexadas: 0 falsos positivos en 50 intentos.
- Sin sesión, `POST /api/recognize` responde 401.
- Error del desfase estimado: <= 1 frame (46 ms) en los aciertos.
