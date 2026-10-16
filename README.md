# Kazammi

Reconocedor de canciones estilo Shazam construido desde cero sobre la **transformada de Fourier**: FFT radix-2 propia, espectrograma por STFT, fingerprinting por constellation map y matching por histograma de desfases. Cada usuario crea su cuenta con correo y contraseña, guarda las canciones que identifica y arma sus propias playlists.

Demo funcional de la investigación *"Reconocimiento de audio musical mediante la transformada de Fourier"*, Ingeniería de Sistemas, Universidad de la Costa (CUC).

## Cómo funciona

```
micrófono -> 11.025 Hz -> STFT (FFT propia) -> picos espectrales -> hashes -> PostgreSQL -> histograma de desfases -> canción
```

El detalle matemático está en [`specs/00-foundation/math-model.md`](./specs/00-foundation/math-model.md).

## Stack

Next.js (App Router) · TypeScript · PostgreSQL (Neon) · Drizzle · Better Auth · Vitest · Vercel

## Desarrollo

El proyecto se construye con Spec Driven Development. Empieza por [`specs/README.md`](./specs/README.md).

Instrucciones de instalación: pendiente (tarea `01-platform/T9`).

## Datos

El catálogo se genera a partir de una carpeta local de canciones de prueba que no forma parte del repositorio. En la base de datos solo se guardan metadatos, una portada reducida y los fingerprints.
