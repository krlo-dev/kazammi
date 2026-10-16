# 01 Platform: requisitos

## Historia

Como desarrollador, quiero un repositorio con tooling y CI listos desde el primer día, para que cada módulo nazca con lint, tipos y tests verificados automáticamente.

## Requisitos

| ID | Prioridad | Requisito |
|---|---|---|
| PLT-R1 | M | EL SISTEMA DEBE ser una app Next.js con App Router, TypeScript `strict` y alias `@/` apuntando a `src/`. |
| PLT-R2 | M | EL SISTEMA DEBE exponer los scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `format`. |
| PLT-R3 | M | EL SISTEMA DEBE tener la estructura de carpetas de `architecture.md` con un `index.ts` vacío por módulo. |
| PLT-R4 | M | SI un archivo importa un módulo saltándose su `index.ts` o viola las reglas de dependencia, ENTONCES el lint DEBE fallar. |
| PLT-R5 | M | CUANDO se hace push o se abre un PR, la CI DEBE ejecutar lint, typecheck, test y build, y fallar si alguno falla. |
| PLT-R6 | M | EL SISTEMA DEBE incluir `.env.example` con todas las variables necesarias (base de datos y Better Auth) y un `.gitignore` que excluya `sources/`, `data/` y `.env*.local`. |
| PLT-R9 | M | `npm run build` y la CI NO DEBEN necesitar credenciales reales: las variables de entorno se leen de forma perezosa y se validan con zod al primer uso. |
| PLT-R7 | S | EL SISTEMA DEBE exponer `GET /api/health` que responda `{ status: "ok", version, fingerprintVersion }`. |
| PLT-R8 | S | EL SISTEMA DEBE incluir un `README.md` con descripción, stack, cómo correr en local y enlace a `specs/`. |

## Criterios de aceptación

- `npm run lint && npm run typecheck && npm test && npm run build` termina sin errores en un clon limpio.
- Un import de prueba `@/modules/dsp/fft` desde `src/app` hace fallar el lint.
- El workflow de GitHub Actions aparece en verde en el primer push.
