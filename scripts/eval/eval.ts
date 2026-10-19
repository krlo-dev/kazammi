import { DEFAULT_PARAMS, fingerprint, FINGERPRINT_VERSION } from "@/modules/fingerprint";
import type { Recognize } from "@/modules/recognition";

import { addNoise, mulberry32 } from "./noise";

const SAMPLE_RATE = DEFAULT_PARAMS.sampleRate;
const FRAME_SECONDS = DEFAULT_PARAMS.hopSize / SAMPLE_RATE;

export interface EvalSong {
  /** Track id in the catalog, or null for holdout songs (not indexed). */
  trackId: number | null;
  label: string;
  pcm: Float32Array;
}

export interface EvalOptions {
  durations: number[];
  snrs: number[];
  /** Segments per duration; each one is tested at every SNR. */
  trials: number;
  /** Segments of holdout songs (10 s, no noise) to count false positives. */
  falsePositiveTrials: number;
  seed: number;
}

export interface TrialResult {
  kind: "indexed" | "holdout";
  duration: number;
  snr: number;
  trial: number;
  song: string;
  expectedTrackId: number | null;
  startSec: number;
  predictedTrackId: number | null;
  hit: boolean;
  /** |estimated offset - true start|, only for hits. */
  offsetErrorSec: number | null;
  score: number;
  runnerUpScore: number;
  queryHashes: number;
  dbMs: number;
  totalMs: number;
}

export interface EvalDeps {
  recognize: Recognize;
  log(line: string): void;
}

const FALSE_POSITIVE_DURATION = 10;

/** Picks a song and a start offset for a segment of `duration` seconds. */
function pickSegment(songs: EvalSong[], duration: number, random: () => number) {
  const candidates = songs.filter((s) => s.pcm.length >= duration * SAMPLE_RATE);
  if (candidates.length === 0) return null;
  const song = candidates[Math.floor(random() * candidates.length)];
  const length = Math.round(duration * SAMPLE_RATE);
  const start = Math.floor(random() * (song.pcm.length - length + 1));
  return { song, start, segment: song.pcm.subarray(start, start + length) };
}

async function query(
  deps: EvalDeps,
  segment: Float32Array,
): Promise<
  Pick<
    TrialResult,
    "predictedTrackId" | "score" | "runnerUpScore" | "queryHashes" | "dbMs" | "totalMs"
  > & { offsetSeconds: number | null }
> {
  const { hashes, anchorFrames } = fingerprint(segment);
  const pairs = Array.from(hashes, (hash, i): [number, number] => [hash, anchorFrames[i]]);
  if (pairs.length === 0) {
    return {
      predictedTrackId: null,
      offsetSeconds: null,
      score: 0,
      runnerUpScore: 0,
      queryHashes: 0,
      dbMs: 0,
      totalMs: 0,
    };
  }
  const result = await deps.recognize({
    fingerprintVersion: FINGERPRINT_VERSION,
    hashes: pairs,
    debug: false,
  });
  return result.status === "match"
    ? {
        predictedTrackId: result.track.id,
        offsetSeconds: result.offsetSeconds,
        score: result.score,
        runnerUpScore: result.runnerUpScore,
        queryHashes: pairs.length,
        ...result.timings,
      }
    : {
        predictedTrackId: null,
        offsetSeconds: null,
        score: result.score,
        runnerUpScore: 0,
        queryHashes: pairs.length,
        ...result.timings,
      };
}

/**
 * For every duration D: draw `trials` segments (seeded), test each one at every SNR.
 * Then draw holdout segments to count false positives. Calls recognize directly (no HTTP).
 */
export async function runEval(
  indexed: EvalSong[],
  holdout: EvalSong[],
  options: EvalOptions,
  deps: EvalDeps,
): Promise<TrialResult[]> {
  const results: TrialResult[] = [];
  const random = mulberry32(options.seed);
  const total = options.durations.length * options.trials * options.snrs.length;

  for (const duration of options.durations) {
    for (let trial = 0; trial < options.trials; trial++) {
      const picked = pickSegment(indexed, duration, random);
      if (!picked) break;
      const startSec = picked.start / SAMPLE_RATE;
      for (const snr of options.snrs) {
        const noisy = addNoise(picked.segment, snr, mulberry32(random() * 2 ** 32));
        const answer = await query(deps, noisy);
        const hit = answer.predictedTrackId === picked.song.trackId;
        results.push({
          kind: "indexed",
          duration,
          snr,
          trial,
          song: picked.song.label,
          expectedTrackId: picked.song.trackId,
          startSec,
          predictedTrackId: answer.predictedTrackId,
          hit,
          offsetErrorSec:
            hit && answer.offsetSeconds !== null ? Math.abs(answer.offsetSeconds - startSec) : null,
          score: answer.score,
          runnerUpScore: answer.runnerUpScore,
          queryHashes: answer.queryHashes,
          dbMs: answer.dbMs,
          totalMs: answer.totalMs,
        });
        const done = results.length;
        if (done % 20 === 0 || done === total) deps.log(`  ${done}/${total} consultas`);
      }
    }
  }

  for (let trial = 0; trial < options.falsePositiveTrials && holdout.length > 0; trial++) {
    const picked = pickSegment(holdout, FALSE_POSITIVE_DURATION, random);
    if (!picked) break;
    const answer = await query(deps, Float32Array.from(picked.segment));
    results.push({
      kind: "holdout",
      duration: FALSE_POSITIVE_DURATION,
      snr: Infinity,
      trial,
      song: picked.song.label,
      expectedTrackId: null,
      startSec: picked.start / SAMPLE_RATE,
      predictedTrackId: answer.predictedTrackId,
      hit: answer.predictedTrackId === null,
      offsetErrorSec: null,
      score: answer.score,
      runnerUpScore: answer.runnerUpScore,
      queryHashes: answer.queryHashes,
      dbMs: answer.dbMs,
      totalMs: answer.totalMs,
    });
  }
  return results;
}

export { FRAME_SECONDS };
