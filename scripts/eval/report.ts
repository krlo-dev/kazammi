// CSV and Markdown output of the offline evaluation (Markdown in Spanish, for the report).
import type { TrialResult } from "./eval";
import { FRAME_SECONDS } from "./eval";

export const snrLabel = (snr: number) => (snr === Infinity ? "∞ dB" : `${snr} dB`);

/** Column of the accuracy tables: white noise at an SNR, or the room at an SNR. */
interface Column {
  condition: TrialResult["condition"];
  snr: number;
}
const columnLabel = ({ condition, snr }: Column) =>
  condition === "room" ? `sala ${snrLabel(snr)}` : snrLabel(snr);

const percent = (part: number, total: number) =>
  total === 0 ? "n/a" : `${((100 * part) / total).toFixed(1)}%`;

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

const CSV_COLUMNS: (keyof TrialResult)[] = [
  "kind",
  "duration",
  "snr",
  "trial",
  "song",
  "expectedTrackId",
  "startSec",
  "predictedTrackId",
  "hit",
  "offsetErrorSec",
  "score",
  "runnerUpScore",
  "queryHashes",
  "dbMs",
  "totalMs",
  "condition",
];

const csvCell = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (value === Infinity) return "inf";
  const text =
    typeof value === "number" && !Number.isInteger(value) ? value.toFixed(4) : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(results: TrialResult[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const result of results) lines.push(CSV_COLUMNS.map((c) => csvCell(result[c])).join(","));
  return lines.join("\n") + "\n";
}

export interface EvalMeta {
  date: string;
  seed: number;
  trials: number;
  indexedSongs: number;
  holdoutSongs: number;
  fingerprintVersion: number;
  minScore: number;
  minRatio: number;
}

export function toMarkdown(results: TrialResult[], meta: EvalMeta): string {
  const indexed = results.filter((r) => r.kind === "indexed");
  const holdout = results.filter((r) => r.kind === "holdout");
  const durations = [...new Set(indexed.map((r) => r.duration))].sort((a, b) => a - b);
  const columnsOf = (condition: Column["condition"]) =>
    [...new Set(indexed.filter((r) => r.condition === condition).map((r) => r.snr))]
      .sort((a, b) => b - a)
      .map((snr) => ({ condition, snr }));
  const columns = [...columnsOf("white"), ...columnsOf("room")];
  const cell = (d: number, c: Column) =>
    indexed.filter((r) => r.duration === d && r.snr === c.snr && r.condition === c.condition);

  const lines: string[] = [
    `## Evaluación offline (${meta.date})`,
    "",
    `${meta.indexedSongs} canciones indexadas, ${meta.trials} segmentos por duración (cada uno probado en todas las condiciones), semilla ${meta.seed}. ` +
      `FINGERPRINT_VERSION ${meta.fingerprintVersion}, umbrales τ_abs = ${meta.minScore} y ρ = ${meta.minRatio}.`,
    "",
    "### Precisión (canción correcta)",
    "",
    "Ruido blanco a cada SNR y, en las columnas «sala», parlante de celular, reflexiones, reverberación y ruido rosa (`scripts/eval/room.ts`).",
    "",
    `| Duración | ${columns.map(columnLabel).join(" | ")} |`,
    `|---|${columns.map(() => "---").join("|")}|`,
  ];
  for (const d of durations) {
    lines.push(
      `| ${d} s | ${columns
        .map((col) => {
          const c = cell(d, col);
          return percent(c.filter((r) => r.hit).length, c.length);
        })
        .join(" | ")} |`,
    );
  }

  lines.push(
    "",
    "### Respuestas incorrectas (otra canción)",
    "",
    `| Duración | ${columns.map(columnLabel).join(" | ")} |`,
    `|---|${columns.map(() => "---").join("|")}|`,
  );
  for (const d of durations) {
    lines.push(
      `| ${d} s | ${columns
        .map((col) => {
          const c = cell(d, col);
          return percent(c.filter((r) => !r.hit && r.predictedTrackId !== null).length, c.length);
        })
        .join(" | ")} |`,
    );
  }

  const hits = indexed.filter((r) => r.offsetErrorSec !== null);
  const offsetErrors = hits.map((r) => r.offsetErrorSec!);
  const withinFrame = offsetErrors.filter((e) => e <= FRAME_SECONDS + 1e-9).length;
  lines.push(
    "",
    "### Desfase estimado (aciertos)",
    "",
    `- Dentro de 1 frame (${(FRAME_SECONDS * 1000).toFixed(0)} ms): ${percent(withinFrame, hits.length)} de ${hits.length} aciertos.`,
    `- Mediana del error: ${(percentile(offsetErrors, 50) * 1000).toFixed(1)} ms; p95: ${(percentile(offsetErrors, 95) * 1000).toFixed(1)} ms.`,
  );
  const repeated = hits.filter((r) => r.offsetErrorSec! > FRAME_SECONDS + 1e-9);
  if (repeated.length > 0) {
    const songs = [...new Set(repeated.map((r) => r.song))].join(", ");
    lines.push(
      `- Aciertos con desfase fuera de 1 frame (partes repetidas de la canción): ${songs}.`,
    );
  }

  lines.push(
    "",
    "### Tiempo de consulta en la base",
    "",
    "| Duración | Hashes (mediana) | p50 | p95 |",
    "|---|---|---|---|",
  );
  for (const d of durations) {
    const rows = indexed.filter((r) => r.duration === d && r.queryHashes > 0);
    const ms = rows.map((r) => r.dbMs);
    lines.push(
      `| ${d} s | ${percentile(
        rows.map((r) => r.queryHashes),
        50,
      )} | ${percentile(ms, 50).toFixed(0)} ms | ${percentile(ms, 95).toFixed(0)} ms |`,
    );
  }

  lines.push("", "### Falsos positivos (canciones no indexadas, 10 s sin ruido)", "");
  if (holdout.length === 0) {
    lines.push("Sin datos: falta `data/songs-holdout/` con canciones que no estén indexadas.");
  } else {
    const falsePositives = holdout.filter((r) => r.predictedTrackId !== null).length;
    lines.push(
      `${falsePositives} falsos positivos en ${holdout.length} intentos (${percent(falsePositives, holdout.length)}), ${meta.holdoutSongs} canciones.`,
    );
  }
  return lines.join("\n") + "\n";
}
