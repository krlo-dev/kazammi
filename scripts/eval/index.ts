// npm run eval -- [--durations 3,5,10,15] [--snr inf,20,10,5,0] [--trials 20] [--seed 42]
// Offline accuracy benchmark against the database of DATABASE_URL (Neon dev). Writes
// reports/eval-<date>.csv and reports/eval-<date>.md.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { createCatalogRepository } from "@/modules/catalog";
import { getDb } from "@/modules/db";
import { DEFAULT_PARAMS, FINGERPRINT_VERSION } from "@/modules/fingerprint";
import { createRecognizer, DEFAULT_MATCH_PARAMS } from "@/modules/recognition";

import { decodeToPcm } from "../ingest/decode";
import { listAudioFiles, sha256File } from "../ingest/scan";
import { runEval, type EvalSong } from "./eval";
import { toCsv, toMarkdown } from "./report";

const list = (value: string) =>
  value.split(",").map((part) => {
    const trimmed = part.trim().toLowerCase();
    const parsed = trimmed === "inf" || trimmed === "∞" ? Infinity : Number(trimmed);
    if (Number.isNaN(parsed)) throw new Error(`Valor inválido en la lista: "${part}"`);
    return parsed;
  });

/** Decodes every song of `dir` once and looks up its track id by content hash. */
async function loadSongs(
  dir: string,
  lookup: (sha: string) => Promise<number | null>,
): Promise<EvalSong[]> {
  if (!existsSync(dir)) return [];
  const songs: EvalSong[] = [];
  for (const file of await listAudioFiles(dir)) {
    const trackId = await lookup(await sha256File(file.absolutePath));
    const pcm = await decodeToPcm(file.absolutePath, { sampleRate: DEFAULT_PARAMS.sampleRate });
    songs.push({ trackId, label: file.relativePath, pcm });
  }
  return songs;
}

/**
 * Retries transient database failures (Neon may drop an idle TLS connection: ECONNRESET).
 * postgres.js reconnects on the next query, so a short wait is enough.
 */
function withRetries<A extends unknown[], R>(fn: (...args: A) => Promise<R>, attempts = 3) {
  return async (...args: A): Promise<R> => {
    for (let attempt = 1; ; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        if (attempt >= attempts) throw error;
        console.log(`  Reintentando consulta (${attempt}/${attempts - 1}): ${String(error)}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  };
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      dir: { type: "string", default: "data/songs" },
      holdout: { type: "string", default: "data/songs-holdout" },
      durations: { type: "string", default: "3,5,10,15" },
      snr: { type: "string", default: "inf,20,10,5,0" },
      trials: { type: "string", default: "20" },
      "fp-trials": { type: "string", default: "50" },
      seed: { type: "string", default: "42" },
      out: { type: "string", default: "reports" },
    },
  });
  for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);

  const catalog = createCatalogRepository(getDb());
  const stats = await catalog.getStats();
  if (stats.fingerprintVersion !== FINGERPRINT_VERSION) {
    console.error(
      `La base está indexada con la versión ${stats.fingerprintVersion} y el código usa ${FINGERPRINT_VERSION}. Ejecuta npm run ingest -- --reset.`,
    );
    return 1;
  }

  console.log("Decodificando canciones...");
  const lookup = (sha: string) => catalog.findTrackIdBySha256(sha);
  const songs = await loadSongs(values.dir, lookup);
  const indexed = songs.filter((s) => s.trackId !== null);
  const notIndexed = songs.filter((s) => s.trackId === null).map((s) => s.label);
  if (notIndexed.length > 0)
    console.log(`  Omitidas (no están en la base): ${notIndexed.join(", ")}`);
  const holdoutAll = await loadSongs(values.holdout, lookup);
  const holdout = holdoutAll.filter((s) => s.trackId === null);
  if (holdoutAll.length > holdout.length) {
    console.log("  Aviso: algunas canciones de holdout están indexadas y se ignoran como holdout.");
  }
  console.log(`  ${indexed.length} indexadas, ${holdout.length} de holdout`);
  if (indexed.length === 0) {
    console.error("No hay canciones indexadas para evaluar.");
    return 1;
  }

  const options = {
    durations: list(values.durations),
    snrs: list(values.snr),
    trials: Number(values.trials),
    falsePositiveTrials: Number(values["fp-trials"]),
    seed: Number(values.seed),
  };
  const started = performance.now();
  const results = await runEval(indexed, holdout, options, {
    recognize: withRetries(createRecognizer({ catalog })),
    log: (line) => console.log(line),
  });

  const date = new Date().toISOString().slice(0, 10);
  const markdown = toMarkdown(results, {
    date,
    seed: options.seed,
    trials: options.trials,
    indexedSongs: indexed.length,
    holdoutSongs: holdout.length,
    fingerprintVersion: FINGERPRINT_VERSION,
    ...DEFAULT_MATCH_PARAMS,
  });
  await mkdir(values.out, { recursive: true });
  const base = path.join(values.out, `eval-${date}`);
  await writeFile(`${base}.csv`, toCsv(results));
  await writeFile(`${base}.md`, markdown);

  console.log("\n" + markdown);
  console.log(
    `${results.length} consultas en ${((performance.now() - started) / 1000).toFixed(0)} s`,
  );
  console.log(`Resultados: ${base}.csv y ${base}.md`);
  return 0;
}

// Explicit exit: the postgres.js connection would otherwise keep the process alive.
main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
