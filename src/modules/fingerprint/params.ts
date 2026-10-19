export interface FingerprintParams {
  readonly sampleRate: 11025;
  readonly windowSize: 1024;
  readonly hopSize: 512;
  /** Log-spaced band edges in bins: band i is [bandEdges[i], bandEdges[i + 1]). */
  readonly bandEdges: readonly number[];
  /** A band maximum is a peak when it is >= peakAlpha * mean of the frame's band maxima. */
  readonly peakAlpha: number;
  /** Minimum absolute magnitude of a peak, after peak normalization of the signal. */
  readonly silenceThreshold: number;
  /** B: a band peak that follows one of the previous frame within ±B bins is dropped. */
  readonly peakContinuityBins: number;
  readonly targetZone: {
    readonly minDeltaFrames: number;
    readonly maxDeltaFrames: number;
    readonly maxDeltaBins: number;
    readonly fanOut: number;
  };
}

export const DEFAULT_PARAMS: FingerprintParams = Object.freeze({
  sampleRate: 11025,
  windowSize: 1024,
  hopSize: 512,
  bandEdges: Object.freeze([1, 10, 20, 40, 80, 160, 512]),
  peakAlpha: 1.0,
  // A full-scale sine under the Hann window peaks near windowSize / 4 = 256, so 1.0 is
  // about -48 dB below it: quiet passages still produce peaks, digital silence does not.
  silenceThreshold: 1.0,
  // ±1 bin absorbs the leakage between neighbor bins: a sustained note yields one peak,
  // the one of its onset, instead of one per frame.
  peakContinuityBins: 1,
  targetZone: Object.freeze({
    minDeltaFrames: 1,
    maxDeltaFrames: 64,
    maxDeltaBins: 128,
    // 10 pairs per anchor (v3): with onset-only peaks, 5 left too few coincidences after a
    // phone speaker and a room (specs/03-fingerprint T9, "sala" condition of the eval).
    fanOut: 10,
  }),
});

/**
 * Version of the fingerprint algorithm and its parameters. Any change to
 * DEFAULT_PARAMS or to the algorithm must increment it (see specs/03-fingerprint).
 */
export const FINGERPRINT_VERSION = 3;
