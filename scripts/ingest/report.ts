// Console output of the ingestion CLI (in Spanish: Krlo reads it).

/**
 * Bytes per fingerprint row including the covering index: 49,790,976 B / 584,673 rows,
 * measured on Neon (PostgreSQL 18) after the first ingestion (specs/05-ingestion).
 */
export const BYTES_PER_FINGERPRINT = 85;
/** Neon free plan storage, and the share the catalog may use (05-ingestion criteria). */
export const FREE_PLAN_BYTES = 1024 ** 3;
export const FREE_PLAN_BUDGET = 0.8;

export type FileOutcome =
  | { status: "inserted" | "regenerated"; label: string; hashes: number; seconds: number }
  | { status: "estimated"; label: string; hashes: number; seconds: number; coverBytes: number }
  | { status: "skipped"; label: string; reason: string }
  | { status: "error"; label: string; reason: string };

export interface IngestSummary {
  dryRun: boolean;
  files: number;
  inserted: number;
  regenerated: number;
  skipped: number;
  errors: { label: string; reason: string }[];
  /** Mean hashes over the songs fingerprinted in this run. */
  averageHashes: number;
  /** Real size of `fingerprints` (pg_total_relation_size), or null in a dry run. */
  tableBytes: number | null;
  /** Estimated catalog size for the songs of this run (fingerprints + covers). */
  estimatedBytes: number;
  /** Tracks still on another fingerprint version (their file was not found during --reset). */
  staleTracks: number;
  elapsedMs: number;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

const number = (value: number) => Math.round(value).toLocaleString("es-CO");

export function formatOutcome(outcome: FileOutcome, done: number, total: number): string {
  const prefix = `[${String(done).padStart(String(total).length)}/${total}]`;
  switch (outcome.status) {
    case "inserted":
    case "regenerated":
    case "estimated": {
      const verb = { inserted: "nueva", regenerated: "regenerada", estimated: "simulada" }[
        outcome.status
      ];
      const detail = `${number(outcome.hashes)} hashes, ${outcome.seconds.toFixed(1)} s de audio`;
      return `${prefix} ok ${outcome.label} (${verb}: ${detail})`;
    }
    case "skipped":
      return `${prefix} -- ${outcome.label} (omitida: ${outcome.reason})`;
    case "error":
      return `${prefix} !! ${outcome.label} (error: ${outcome.reason})`;
  }
}

export function formatSummary(summary: IngestSummary): string {
  const lines = [
    "",
    summary.dryRun ? "Resumen (dry run, no se escribió nada):" : "Resumen:",
    `  Archivos:              ${summary.files}`,
    `  Canciones nuevas:      ${summary.inserted}`,
  ];
  if (summary.regenerated > 0) lines.push(`  Regeneradas (--reset): ${summary.regenerated}`);
  lines.push(
    `  Omitidas:              ${summary.skipped}`,
    `  Con error:             ${summary.errors.length}`,
    `  Hashes por canción:    ${number(summary.averageHashes)} en promedio`,
  );
  if (summary.tableBytes !== null) {
    lines.push(`  Tamaño de fingerprints: ${formatBytes(summary.tableBytes)}`);
  }
  const share = summary.estimatedBytes / FREE_PLAN_BYTES;
  lines.push(
    `  Tamaño estimado:       ${formatBytes(summary.estimatedBytes)} (${(share * 100).toFixed(1)}% de 1 GB)`,
  );
  if (share > FREE_PLAN_BUDGET) {
    lines.push(
      `  ATENCIÓN: supera el ${FREE_PLAN_BUDGET * 100}% del plan gratuito. Reduce peakAlpha/fanOut.`,
    );
  }
  if (summary.staleTracks > 0) {
    lines.push(
      `  ATENCIÓN: ${summary.staleTracks} canciones quedaron sin fingerprints (no se encontró su archivo).`,
    );
  }
  lines.push(`  Tiempo total:          ${(summary.elapsedMs / 1000).toFixed(1)} s`);
  for (const error of summary.errors) lines.push(`  !! ${error.label}: ${error.reason}`);
  return lines.join("\n");
}
