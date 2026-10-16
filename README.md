# Kazammi

[![CI](https://github.com/krlo-dev/kazammi/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/krlo-dev/kazammi/actions/workflows/ci.yml)

Reconocedor de canciones estilo Shazam construido desde cero sobre la **transformada de Fourier**: FFT radix-2 propia, espectrograma por STFT, fingerprinting por constellation map y matching por histograma de desfases. Cada usuario crea su cuenta con correo y contraseña, guarda las canciones que identifica y arma sus propias playlists.

Demo funcional de la investigación *"Reconocimiento de audio musical mediante la transformada de Fourier"*, Ingeniería de Sistemas, Universidad de la Costa (CUC).

## Cómo funciona

```
micrófono -> 11.025 Hz -> STFT (FFT propia) -> picos espectrales -> hashes -> PostgreSQL -> histograma de desfases -> canción
```

El fingerprint se calcula en el navegador, dentro de un Web Worker: al servidor solo llegan los hashes, nunca el audio. El detalle matemático está en [`specs/00-foundation/math-model.md`](./specs/00-foundation/math-model.md).

## Stack

| Área | Herramienta |
|---|---|
| Framework | Next.js (App Router) + React, TypeScript `strict` |
| Base de datos | PostgreSQL en Neon, Drizzle ORM |
| Autenticación | Better Auth, correo y contraseña con bcrypt |
| Estilos | Tailwind CSS |
| Validación | zod |
| Tests | Vitest (PGlite para la base de datos) |
| Calidad | ESLint con `eslint-plugin-boundaries`, Prettier, GitHub Actions |
| Despliegue | Vercel |

La FFT, el espectrograma, el fingerprinting y el matching no usan librerías de DSP.

## Arquitectura

Monolito modular: una sola app Next.js dividida en módulos (`dsp`, `fingerprint`, `capture`, `db`, `auth`, `catalog`, `recognition`, `library`, `shared`) bajo `src/modules/` y `src/shared/`. Cada módulo se importa solo por su `index.ts` y las dependencias permitidas entre módulos las verifica ESLint. El mapa completo está en [`specs/00-foundation/architecture.md`](./specs/00-foundation/architecture.md).

## Correr en local

### Requisitos

- Node.js 22 y npm.
- Una base de datos PostgreSQL en [Neon](https://neon.tech) (plan gratuito) con una rama `dev` para desarrollo.
- [ffmpeg](https://ffmpeg.org) en el sistema, solo para la ingesta de canciones (`winget install ffmpeg` en Windows).

### Pasos

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` a `.env.local` y completa los valores:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | Cadena de conexión "pooled" de la rama `dev` de Neon |
   | `BETTER_AUTH_SECRET` | Secreto de al menos 32 caracteres (`openssl rand -base64 32`) |
   | `BETTER_AUTH_URL` | `http://localhost:3000` |

   Las variables se validan la primera vez que el servidor las usa, así que `npm run build` funciona sin ellas.

3. Levanta el servidor de desarrollo y abre <http://localhost:3000>:

   ```bash
   npm run dev
   ```

   `GET /api/health` responde `{ "status": "ok", ... }` y sirve para comprobar que la app está arriba.

El micrófono del navegador solo funciona en `localhost` o con HTTPS.

### Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build de producción |
| `npm run lint` | ESLint, incluidos los límites entre módulos |
| `npm run typecheck` | Genera los tipos de rutas de Next y corre `tsc --noEmit` |
| `npm test` | Tests con Vitest (`npm test -- --coverage` para cobertura) |
| `npm run test:watch` | Tests en modo watch |
| `npm run format` | Formatea el código con Prettier (`format:check` solo verifica) |

Las migraciones (`db:migrate`), la ingesta (`ingest`) y la evaluación offline (`eval`) se agregan en las fases de base de datos y reconocimiento; ver [`specs/00-foundation/roadmap.md`](./specs/00-foundation/roadmap.md).

## Desarrollo

El proyecto se construye con **Spec Driven Development**: [`specs/`](./specs/) es la fuente de verdad. Empieza por [`specs/README.md`](./specs/README.md) y el [roadmap](./specs/00-foundation/roadmap.md).

- El desarrollo diario se hace en `develop`; `main` es la rama desplegable y solo recibe merges desde `develop`.
- Commits en [Conventional Commits](https://www.conventionalcommits.org/), en inglés.
- La CI corre lint, typecheck, tests y build en cada push y pull request.

## Datos

El catálogo se genera a partir de una carpeta local de canciones de prueba (`data/songs/`) que no forma parte del repositorio. En la base de datos solo se guardan metadatos, una portada reducida y los fingerprints.
