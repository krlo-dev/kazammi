// npm run ingest -- [--dir data/songs] [--limit N] [--concurrency 4] [--dry-run] [--reset]
// Indexes local songs into the database of DATABASE_URL. Never runs in the deployed app.
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";

import { createCatalogRepository } from "@/modules/catalog";
import { getDb } from "@/modules/db";
import { DEFAULT_PARAMS } from "@/modules/fingerprint";

import { decodeToPcm } from "./decode";
import { runIngest, VersionMismatchError } from "./ingest";
import { normalizeCover, readMetadata } from "./metadata";
import { encodePreview } from "./preview";
import { formatSummary } from "./report";

const HELP = `Uso: npm run ingest -- [opciones]

  --dir <carpeta>      Carpeta de canciones (por defecto data/songs)
  --limit <n>          Procesa solo los primeros n archivos
  --concurrency <n>    Archivos en paralelo (por defecto 4)
  --dry-run            Procesa todo sin escribir en la base y estima el tamaño
  --reset              Regenera todos los fingerprints (conserva canciones, Guardadas y playlists)
  --help               Muestra esta ayuda`;

function positiveInt(name: string, value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`--${name} debe ser un entero positivo, se recibió "${value}"`);
  }
  return parsed;
}

async function main(): Promise<number> {
  if (process.env.VERCEL) {
    console.error("La ingesta solo se ejecuta en local, nunca en el despliegue.");
    return 1;
  }

  const { values } = parseArgs({
    options: {
      dir: { type: "string", default: "data/songs" },
      limit: { type: "string" },
      concurrency: { type: "string", default: "4" },
      "dry-run": { type: "boolean", default: false },
      reset: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(HELP);
    return 0;
  }
  if (!existsSync(values.dir)) {
    console.error(`No existe la carpeta ${values.dir}`);
    return 1;
  }

  const dryRun = values["dry-run"];
  if (!dryRun) {
    // Same precedence as Next.js: .env.local wins over .env (loadEnvFile never overrides).
    for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);
  }

  try {
    const summary = await runIngest(
      {
        dir: values.dir,
        limit: positiveInt("limit", values.limit),
        concurrency: positiveInt("concurrency", values.concurrency) ?? 4,
        dryRun,
        reset: values.reset,
      },
      {
        catalog: dryRun ? null : createCatalogRepository(getDb()),
        decode: (file) => decodeToPcm(file, { sampleRate: DEFAULT_PARAMS.sampleRate }),
        readMetadata,
        normalizeCover,
        encodePreview: (file, startSec) => encodePreview(file, startSec),
        log: (line) => console.log(line),
      },
    );
    console.log(formatSummary(summary));
    return summary.errors.length > 0 ? 2 : 0;
  } catch (error) {
    if (error instanceof VersionMismatchError) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }
}

// Explicit exit: the postgres.js connection would otherwise keep the process alive.
main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
