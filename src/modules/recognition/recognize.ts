import type { CatalogRepository } from "@/modules/catalog";
import { DEFAULT_PARAMS } from "@/modules/fingerprint";
import type { ParsedRecognizeRequest, RecognizedTrack } from "@/shared";

import { decide, DEFAULT_MATCH_PARAMS, type MatchParams } from "./match";

/** Candidate tracks read from the database per query (one row per track). */
const CANDIDATES = 10;
/** Offsets returned in the debug histogram (the most voted ones). */
const HISTOGRAM_BINS = 200;
/** The indexed fingerprint version is cached for this long (a re-ingestion may change it). */
const VERSION_TTL_MS = 60_000;

export class VersionMismatchError extends Error {
  override name = "VersionMismatchError";
  constructor(
    readonly requested: number,
    readonly indexed: number | null,
  ) {
    super(
      indexed === null
        ? "The catalog has not been indexed yet"
        : `Fingerprint version ${requested} does not match the indexed version ${indexed}`,
    );
  }
}

/** recognition does not know users: `saved` is added by the route handler. */
export type RecognitionResult =
  | {
      status: "match";
      track: RecognizedTrack;
      confidence: number;
      offsetSeconds: number;
      score: number;
      runnerUpScore: number;
      timings: { dbMs: number; totalMs: number };
      debug?: { histogram: [number, number][] };
    }
  | { status: "no_match"; score: number; timings: { dbMs: number; totalMs: number } };

export interface RecognizerDeps {
  catalog: CatalogRepository;
  params?: MatchParams;
  now?: () => number;
}

const round = (ms: number) => Math.round(ms * 10) / 10;

/** Recognizer with an in-process cache of the indexed fingerprint version. */
export function createRecognizer(deps: RecognizerDeps) {
  const { catalog, params = DEFAULT_MATCH_PARAMS, now = () => performance.now() } = deps;
  let cachedVersion: { value: number | null; at: number } | undefined;

  async function indexedVersion(): Promise<number | null> {
    if (!cachedVersion || now() - cachedVersion.at > VERSION_TTL_MS) {
      cachedVersion = { value: (await catalog.getStats()).fingerprintVersion, at: now() };
    }
    return cachedVersion.value;
  }

  return async function recognize(input: ParsedRecognizeRequest): Promise<RecognitionResult> {
    const started = now();
    const version = await indexedVersion();
    if (version !== input.fingerprintVersion) {
      throw new VersionMismatchError(input.fingerprintVersion, version);
    }

    const hashes = Uint32Array.from(input.hashes, ([hash]) => hash);
    const times = Uint32Array.from(input.hashes, ([, t]) => t);

    const dbStarted = now();
    const candidates = await catalog.findCandidates(hashes, times, CANDIDATES);
    let dbMs = now() - dbStarted;
    const decision = decide(candidates, params);

    if (decision.status === "no_match") {
      return {
        status: "no_match",
        score: decision.score,
        timings: { dbMs: round(dbMs), totalMs: round(now() - started) },
      };
    }

    const lookupStarted = now();
    const [[track], histogram] = await Promise.all([
      catalog.getTracksByIds([decision.trackId]),
      input.debug
        ? catalog.getOffsetHistogram(decision.trackId, hashes, times, HISTOGRAM_BINS)
        : Promise.resolve(undefined),
    ]);
    dbMs += now() - lookupStarted;
    if (!track) {
      // Deleted between the two queries: treat it as not found rather than failing.
      return {
        status: "no_match",
        score: decision.score,
        timings: { dbMs: round(dbMs), totalMs: round(now() - started) },
      };
    }

    const { hasCover, ...metadata } = track;
    return {
      status: "match",
      track: { ...metadata, coverUrl: hasCover ? `/api/tracks/${track.id}/cover` : null },
      confidence: decision.confidence,
      offsetSeconds: (decision.delta * DEFAULT_PARAMS.hopSize) / DEFAULT_PARAMS.sampleRate,
      score: decision.score,
      runnerUpScore: decision.runnerUpScore,
      timings: { dbMs: round(dbMs), totalMs: round(now() - started) },
      ...(histogram ? { debug: { histogram } } : {}),
    };
  };
}

export type Recognize = ReturnType<typeof createRecognizer>;
