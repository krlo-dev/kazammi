# Convenciones

## Idioma

| Qué | Idioma |
|---|---|
| Código: identificadores, comentarios, nombres de archivo | Inglés |
| Mensajes de commit y nombres de ramas | Inglés |
| Specs, README, documentación | Español |
| Textos visibles en la UI | Español |

En toda la documentación y mensajes **no se usan rayas largas** (em-dash). Se usan comas, dos puntos o puntos.

## Stack

| Área | Herramienta |
|---|---|
| Framework | Next.js (última versión estable, App Router) + React |
| Lenguaje | TypeScript en modo `strict` |
| Gestor de paquetes | npm (con `package-lock.json` versionado) |
| Base de datos | PostgreSQL en Neon (plan gratuito); ramas `main` (producción) y `dev` |
| ORM / migraciones | Drizzle ORM + drizzle-kit, driver `postgres` (postgres.js) |
| Autenticación | Better Auth con adaptador Drizzle; correo y contraseña con `bcryptjs` (costo 12) |
| Validación | zod |
| Tests | Vitest; PGlite (Postgres en memoria) para los tests de base de datos |
| Lint / formato | ESLint (con `eslint-plugin-boundaries`) + Prettier |
| CI | GitHub Actions |
| Scripts Node | tsx |
| Audio en la ingesta | ffmpeg (sistema), `music-metadata` (ID3), `sharp` (portadas) |
| Diseño | Claude Code con el skill Impeccable |

## Código

- Funciones puras en `dsp` y `fingerprint`: sin efectos secundarios, sin estado global, entradas y salidas tipadas.
- Arreglos numéricos con typed arrays (`Float32Array`, `Float64Array`, `Uint32Array`), nunca `number[]` en rutas calientes.
- Parámetros del algoritmo centralizados en `fingerprint/params.ts`; nada de números mágicos dispersos.
- Cada módulo expone solo lo necesario desde su `index.ts`.
- Errores de dominio como clases en `shared/errors.ts`; route handlers y server actions los traducen a códigos HTTP o mensajes.
- Mutaciones de la biblioteca con **Server Actions**; lecturas con **Server Components**. Route handlers solo para lo que llama el cliente por `fetch` (`/api/recognize`) o para binarios (portadas).

## Tests

- Todo archivo de `dsp`, `fingerprint`, `recognition` y `library` tiene tests unitarios en `__tests__/`.
- Los tests de `dsp` comparan contra la DFT de referencia y contra casos analíticos (senoidal pura, impulso, constante).
- Los tests de fingerprint usan señales sintéticas deterministas (sin archivos de audio en el repo).
- Los tests de `catalog` y `library` corren las migraciones reales sobre PGlite.
- Meta de cobertura para `dsp` y `fingerprint`: >= 90% de líneas.

## Ramas

- `main`: siempre desplegable. Vercel despliega producción desde aquí. Solo recibe merges desde `develop`.
- `develop`: rama de integración donde se hace el desarrollo diario.
- Ramas de trabajo opcionales, creadas desde `develop`: `feat/<módulo>-<tema>`, `fix/<tema>`, `docs/<tema>`, `chore/<tema>`.
- Cada push y cada PR disparan la CI; cada PR genera un preview deployment en Vercel.

## Commits: Conventional Commits

```
<type>(<scope>): <summary in imperative, lowercase, no period>

[optional body: what and why, wrapped at 72 chars]

[optional footer: Refs: DSP-R1, DSP-R2]
```

| type | Uso |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `test` | Solo tests |
| `refactor` | Cambio interno sin cambiar comportamiento |
| `perf` | Mejora de rendimiento |
| `docs` | Specs, README, comentarios |
| `chore` | Tooling, dependencias, configuración |
| `ci` | GitHub Actions |
| `build` | Build, Docker, despliegue |

Scopes válidos: `specs`, `platform`, `dsp`, `fingerprint`, `db`, `catalog`, `ingest`, `recognition`, `capture`, `auth`, `library`, `ui`, `deploy`, `eval`.

**Flujo de commits**: Claude propone el mensaje al terminar cada tarea (aparece en `tasks.md`); Krlo revisa, hace el commit y el push. Claude no ejecuta `git commit` ni `git push`.
