# 01 Platform: diseño

## Scaffold

`create-next-app` rechaza carpetas que no estén vacías, y el repo ya tiene `specs/`, `CLAUDE.md`, `README.md`, `.gitignore` y `sources/`. Por eso se genera en una carpeta temporal y se mueve:

```bash
# desde la carpeta padre de kazammi/
npx create-next-app@latest kazammi-scaffold --ts --app --src-dir --eslint --import-alias "@/*" --use-npm --disable-git
# mover todo el contenido de kazammi-scaffold/ a kazammi/ (incluidos los archivos ocultos)
# conservar nuestro README.md, CLAUDE.md y .gitignore; si el scaffold trae los suyos, fusionarlos
# borrar kazammi-scaffold/
```

Si se usa Tailwind lo decide la sesión de diseño con Impeccable; el scaffold no impone estilos.

## Dependencias base

| Tipo | Paquetes |
|---|---|
| runtime | `zod`, `server-only`, `client-only` |
| dev | `vitest`, `@vitest/coverage-v8`, `tsx`, `prettier`, `eslint-plugin-boundaries` |

Las dependencias de cada fase se agregan en su propia tarea (Drizzle y `postgres` en `04-catalog`, Better Auth en `10-auth`, etc.), no todas al inicio.

## Configuración de límites entre módulos

`eslint-plugin-boundaries` con estos elementos:

| Elemento | Patrón | Puede importar |
|---|---|---|
| `shared` | `src/shared/**` | nada |
| `dsp` | `src/modules/dsp/**` | `shared` |
| `fingerprint` | `src/modules/fingerprint/**` | `dsp`, `shared` |
| `capture` | `src/modules/capture/**` | `fingerprint`, `dsp`, `shared` |
| `db` | `src/modules/db/**` | `shared` |
| `auth` | `src/modules/auth/**` | `db`, `shared` |
| `catalog` | `src/modules/catalog/**` | `db`, `shared` |
| `recognition` | `src/modules/recognition/**` | `catalog`, `fingerprint`, `shared` |
| `library` | `src/modules/library/**` | `db`, `catalog`, `shared` |
| `app` | `src/app/**`, `src/proxy.ts` | todos, solo por su entrada pública |
| `scripts` | `scripts/**` | `fingerprint`, `catalog`, `db`, `dsp`, `recognition`, `shared` |

Regla `boundaries/entry-point`: solo se permite importar `index.ts` de cada módulo, más `auth/client.ts`.

## Variables de entorno

`src/shared/env.ts` expone `getServerEnv()`, que valida con zod la primera vez que se llama (no al importar), para que `npm run build` funcione sin credenciales.

`.env.example`:

```
# Neon: cadena "pooled" de la rama correspondiente (dev en local, main en producción)
DATABASE_URL=postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/kazammi?sslmode=require

# Better Auth
BETTER_AUTH_SECRET=        # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
```

## CI (`.github/workflows/ci.yml`)

```yaml
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage   # BD con PGlite, sin servicios externos
      - run: npm run build
```

Las versiones de las actions se confirman al implementar.

## Health endpoint

`src/app/api/health/route.ts` devuelve la versión de `package.json`, `FINGERPRINT_VERSION` exportada por `@/modules/fingerprint` y, desde `04-catalog`, el resultado de un `SELECT 1` a la base. Es pública (no exige sesión) y sirve para despertar Neon antes de presentar.
