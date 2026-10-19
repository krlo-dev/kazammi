import type { Fingerprint, FingerprintDebug } from "@/modules/fingerprint";
import type { RecognizeRequest, RecognizeResponse } from "@/shared";

import { ATTEMPT_SECONDS } from "./machine";

/**
 * Index of the attempt that should start now, or null. Attempts are cumulative
 * (4, 8 and 12 s of audio from the start) and never overlap (CAP-R5).
 */
export function dueAttempt(elapsedMs: number, started: number, processing: boolean): number | null {
  if (processing || started >= ATTEMPT_SECONDS.length) return null;
  return elapsedMs >= ATTEMPT_SECONDS[started] * 1000 ? started : null;
}

export interface AttemptDeps {
  resample(pcm: Float32Array, fromRate: number): Promise<Float32Array>;
  fingerprint(
    pcm: Float32Array,
    debug: boolean,
  ): Promise<Fingerprint & { debug?: FingerprintDebug }>;
  toRequest(fp: Fingerprint, debug: boolean): RecognizeRequest;
  recognize(request: RecognizeRequest): Promise<RecognizeResponse>;
}

export interface AttemptResult {
  response: RecognizeResponse;
  /** PCM at 11,025 Hz that was fingerprinted (kept before the worker empties it). */
  pcm: Float32Array;
  debug?: FingerprintDebug;
}

/** One attempt: device audio -> 11,025 Hz -> fingerprint in the worker -> API. */
export async function runAttempt(
  deps: AttemptDeps,
  audio: Float32Array,
  sampleRate: number,
  debug: boolean,
): Promise<AttemptResult> {
  const pcm = await deps.resample(audio, sampleRate);
  // The worker takes ownership of the buffer it receives: send a copy when debug keeps it.
  const kept = debug ? pcm.slice() : pcm;
  const fp = await deps.fingerprint(pcm, debug);
  // Silence yields no hashes, and the API requires at least one: it is a plain no_match.
  const response: RecognizeResponse =
    fp.hashes.length === 0
      ? { status: "no_match", score: 0, timings: { dbMs: 0, totalMs: 0 } }
      : await deps.recognize(deps.toRequest(fp, debug));
  return { response, pcm: kept, debug: fp.debug };
}
