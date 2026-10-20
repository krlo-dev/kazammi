export interface FingerprintParams {
  readonly sampleRate: 11025;
  readonly windowSize: 1024;
  readonly hopSize: 256;
  /** A peak is the largest bin within ±bins and ±frames of itself. */
  readonly neighborhood: { readonly bins: number; readonly frames: number };
  /** Peaks are searched in bins [minBin, maxBin). */
  readonly minBin: number;
  readonly maxBin: number;
  /** Minimum level of a peak in dB relative to the loudest bin of the spectrogram. */
  readonly peakFloorDb: number;
  /** At most this many louder peaks may lie within ±0.5 s of a peak. */
  readonly maxPeaksPerSecond: number;
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
  // 23 ms per frame (v5): random coincidences spread over twice as many offsets, so the
  // noise floor of a wrong song halves at the same peak density (specs/03-fingerprint T11).
  hopSize: 256,
  // ±6 bins (65 Hz) and ±10 frames (232 ms). The 2D maxima replaced the onset peaks of v3,
  // which did not survive a phone speaker and a room (specs/03-fingerprint T10 and T11).
  neighborhood: Object.freeze({ bins: 6, frames: 10 }),
  // 248 Hz to 4 kHz, the band a phone speaker actually plays.
  minBin: 23,
  maxBin: 372,
  peakFloorDb: -70,
  maxPeaksPerSecond: 30,
  targetZone: Object.freeze({
    minDeltaFrames: 1,
    // 128 frames of 23 ms: the same 3 s target zone as 64 frames of 46 ms.
    maxDeltaFrames: 128,
    maxDeltaBins: 128,
    fanOut: 10,
  }),
});

/**
 * Version of the fingerprint algorithm and its parameters. Any change to
 * DEFAULT_PARAMS or to the algorithm must increment it (see specs/03-fingerprint).
 */
export const FINGERPRINT_VERSION = 5;
