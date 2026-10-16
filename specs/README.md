# Specs de Kazammi

Este proyecto se desarrolla con **Spec Driven Development (SDD)**: ninguna línea de código se escribe sin una spec que diga qué se construye, por qué y cómo se verifica.

## Flujo de trabajo

```
requirements.md  ->  design.md  ->  tasks.md  ->  código + tests  ->  commit
   (qué y por qué)    (cómo)        (pasos)        (verificable)     (lo hace Krlo)
```

1. **requirements.md**: historias de usuario y requisitos en formato EARS con IDs (`DSP-R1`). Cada requisito tiene criterios de aceptación verificables.
2. **design.md**: interfaces TypeScript, estructuras de datos, decisiones y alternativas descartadas. Cada decisión referencia los requisitos que cumple.
3. **tasks.md**: lista ordenada de tareas pequeñas. Cada tarea indica qué requisitos cubre, cómo se verifica y el mensaje de commit sugerido.
4. Al terminar una tarea se marca `[x]` en `tasks.md` y se hace el commit con el mensaje sugerido.

Si durante la implementación algo de la spec resulta incorrecto, **primero se corrige la spec** (commit `docs(specs): ...`) y después el código.

## Formato EARS de requisitos

| Patrón | Plantilla |
|---|---|
| Ubicuo | EL SISTEMA DEBE `<acción>` |
| Por evento | CUANDO `<evento>`, EL SISTEMA DEBE `<acción>` |
| Por estado | MIENTRAS `<estado>`, EL SISTEMA DEBE `<acción>` |
| No deseado | SI `<condición>`, ENTONCES EL SISTEMA DEBE `<acción>` |
| Opcional | DONDE `<característica>`, EL SISTEMA DEBE `<acción>` |

Prioridad con MoSCoW: **M** (must), **S** (should), **C** (could), **W** (won't, esta versión).

## Índice

| # | Spec | Contenido | Estado |
|---|---|---|---|
| 00 | [foundation](./00-foundation/) | Visión, arquitectura, modelo matemático, convenciones, roadmap | Borrador |
| 01 | [platform](./01-platform/) | Scaffold Next.js, tooling, CI | Hecha |
| 02 | [dsp](./02-dsp/) | FFT propia, ventanas, STFT | Hecha |
| 03 | [fingerprint](./03-fingerprint/) | Picos espectrales y hashes combinatorios | Hecha |
| 04 | [catalog](./04-catalog/) | Módulo `db` (Neon, Drizzle, migraciones) y catálogo de canciones | Hecha |
| 05 | [ingestion](./05-ingestion/) | CLI de ingesta de la carpeta de canciones de prueba | Hecha |
| 06 | [recognition](./06-recognition/) | Matching por histograma de offsets, API y evaluación | Borrador |
| 07 | [capture](./07-capture/) | Micrófono, remuestreo y Web Worker | Borrador |
| 08 | [ui](./08-ui/) | Pantallas, estados y referencias de diseño (Claude Code + Impeccable) | Borrador |
| 09 | [deploy](./09-deploy/) | Vercel + Neon | Borrador |
| 10 | [auth](./10-auth/) | Registro e inicio de sesión con correo y contraseña (bcrypt + Better Auth) | Borrador |
| 11 | [library](./11-library/) | Guardadas y playlists personalizadas | Borrador |

El orden de implementación no sigue la numeración: ver [`roadmap.md`](./00-foundation/roadmap.md).

Estados posibles: `Borrador` -> `Aprobada` -> `En progreso` -> `Hecha`.
