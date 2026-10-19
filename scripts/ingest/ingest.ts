import type { CatalogRepository, Cover } from "@/modules/catalog";
import { DEFAULT_PARAMS, fingerprint, FINGERPRINT_VERSION } from "@/modules/fingerprint";

import type { TrackMetadata } from "./metadata";
import { COVER_MIME } from "./metadata";
import { createSerialQueue, forEachConcurrent } from "./pool";
import {
  BYTES_PER_FINGERPRINT,
  formatOutcome,
  type FileOutcome,
  type IngestSummary,
} from "./report";
import { listAudioFiles, sha256File } from "./scan";

/** Shorter files cannot be recognized reliably (ING-R8). */
export const MIN_DURATION_SEC = 10;

export class VersionMismatchError extends Error {
  override name = "VersionMismatchError";
  constructor(readonly indexed: number) {
    super(
      `La base está indexada con FINGERPRINT_VERSION ${indexed} y el código usa ${FINGERPRINT_VERSION}. ` +
        "Ejecuta de nuevo con --reset para regenerar los fingerprints (se conservan canciones, Guardadas y playlists).",
    );
  }
}

export interface IngestOptions {
  dir: string;
  limit?: number;
  concurrency: number;
  dryRun: boolean;
  reset: boolean;
}

export interface IngestDeps {
  /** null in a dry run: nothing is read from or written to the database. */
  catalog: CatalogRepository | null;
  decode(file: string): Promise<Float32Array>;
  readMetadata(file: string): Promise<TrackMetadata>;
  normalizeCover(picture: Uint8Array): Promise<Uint8Array>;
  log(line: string): void;
}

const reasonOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * scan -> SHA-256 -> skip known files -> [concurrent] tags + cover + ffmpeg + fingerprint
 * -> [serial] one transaction per song -> VACUUM ANALYZE + app_meta + summary.
 */
export async function runIngest(options: IngestOptions, deps: IngestDeps): Promise<IngestSummary> {
  const started = performance.now();
  // null in a dry run: every database access below goes through `repo`.
  const repo = options.dryRun ? null : deps.catalog;
  const dryRun = repo === null;

  if (repo) {
    const indexedVersion = (await repo.getStats()).fingerprintVersion;
    if (indexedVersion !== null && indexedVersion !== FINGERPRINT_VERSION && !options.reset) {
      throw new VersionMismatchError(indexedVersion);
    }
    if (options.reset) {
      deps.log("--reset: borrando todos los fingerprints (se conservan las canciones)...");
      await repo.deleteAllFingerprints();
    }
  }

  let files = await listAudioFiles(options.dir);
  if (options.limit !== undefined) files = files.slice(0, options.limit);
  deps.log(`${files.length} archivos de audio en ${options.dir}${dryRun ? " (dry run)" : ""}`);

  const outcomes: FileOutcome[] = [];
  let coverBytesWritten = 0;
  const write = createSerialQueue();
  const report = (outcome: FileOutcome) => {
    outcomes.push(outcome);
    deps.log(formatOutcome(outcome, outcomes.length, files.length));
  };

  await forEachConcurrent(files, options.concurrency, async (file) => {
    let label = file.relativePath;
    try {
      const sha = await sha256File(file.absolutePath);
      const existingId = repo ? await repo.findTrackIdBySha256(sha) : null;
      if (existingId !== null && !options.reset) {
        report({ status: "skipped", label, reason: "ya está en la base" });
        return;
      }

      const meta = await deps.readMetadata(file.absolutePath);
      label = `${meta.artist} - ${meta.title}`;

      const pcm = await deps.decode(file.absolutePath);
      const seconds = pcm.length / DEFAULT_PARAMS.sampleRate;
      if (seconds < MIN_DURATION_SEC) {
        report({
          status: "error",
          label,
          reason: `dura ${seconds.toFixed(1)} s (< ${MIN_DURATION_SEC} s)`,
        });
        return;
      }
      const { hashes, anchorFrames } = fingerprint(pcm);

      let cover: Cover | null = null;
      if (meta.picture && existingId === null) {
        try {
          cover = { mime: COVER_MIME, data: await deps.normalizeCover(meta.picture) };
        } catch (error) {
          deps.log(
            `   aviso: ${label}: portada ilegible, se indexa sin portada (${reasonOf(error)})`,
          );
        }
      }

      if (!repo) {
        const coverBytes = cover?.data.byteLength ?? 0;
        report({ status: "estimated", label, hashes: hashes.length, seconds, coverBytes });
        return;
      }

      await write(async () => {
        if (existingId !== null) {
          await repo.replaceFingerprints({
            trackId: existingId,
            hashes,
            anchorFrames,
            fingerprintVersion: FINGERPRINT_VERSION,
          });
        } else {
          await repo.insertTrackWithFingerprints({
            track: {
              sourcePath: file.relativePath,
              contentSha256: sha,
              title: meta.title,
              artist: meta.artist,
              album: meta.album,
              genre: meta.genre,
              year: meta.year,
              durationSec: seconds,
            },
            cover,
            hashes,
            anchorFrames,
            fingerprintVersion: FINGERPRINT_VERSION,
          });
        }
      });
      if (cover) coverBytesWritten += cover.data.byteLength;
      report({
        status: existingId !== null ? "regenerated" : "inserted",
        label,
        hashes: hashes.length,
        seconds,
      });
    } catch (error) {
      report({ status: "error", label, reason: reasonOf(error) });
    }
  });

  let tableBytes: number | null = null;
  let staleTracks = 0;
  const count = (status: FileOutcome["status"]) =>
    outcomes.filter((o) => o.status === status).length;
  if (repo) {
    deps.log("VACUUM ANALYZE fingerprints...");
    await repo.vacuumFingerprints();
    await repo.setFingerprintVersion(FINGERPRINT_VERSION);
    const stats = await repo.getStats();
    tableBytes = stats.tableBytes;
    if (options.reset) staleTracks = stats.tracks - count("inserted") - count("regenerated");
  }

  const fingerprinted = outcomes.filter(
    (o): o is Extract<FileOutcome, { hashes: number }> => "hashes" in o,
  );
  const totalHashes = fingerprinted.reduce((sum, o) => sum + o.hashes, 0);
  const coverBytes =
    coverBytesWritten +
    fingerprinted.reduce((sum, o) => sum + ("coverBytes" in o ? o.coverBytes : 0), 0);

  return {
    dryRun,
    files: files.length,
    inserted: count("inserted"),
    regenerated: count("regenerated"),
    skipped: count("skipped"),
    errors: outcomes.flatMap((o) =>
      o.status === "error" ? [{ label: o.label, reason: o.reason }] : [],
    ),
    averageHashes: fingerprinted.length > 0 ? totalHashes / fingerprinted.length : 0,
    tableBytes,
    estimatedBytes: totalHashes * BYTES_PER_FINGERPRINT + coverBytes,
    staleTracks,
    elapsedMs: performance.now() - started,
  };
}
