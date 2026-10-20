export interface FingerprintParams {
  readonly sampleRate: 11025;
  readonly windowSize: 1024;
  readonly hopSize: 512;
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
  hopSize: 512,
  // ±10 bins (108 Hz) and ±5 frames (232 ms): the best match on real phone recordings,
  // where the onset peaks of v3 did not survive the room (specs/03-fingerprint T10).
  neighborhood: Object.freeze({ bins: 10, frames: 5 }),
  // 248 Hz to 4 kHz, the band a phone speaker actually plays.
  minBin: 23,
  maxBin: 372,
  peakFloorDb: -70,
  maxPeaksPerSecond: 20,
  targetZone: Object.freeze({
    minDeltaFrames: 1,
    maxDeltaFrames: 64,
    maxDeltaBins: 128,
    fanOut: 10,
  }),
});

/**
 * Version of the fingerprint algorithm and its parameters. Any change to
 * DEFAULT_PARAMS or to the algorithm must increment it (see specs/03-fingerprint).
 */
export const FINGERPRINT_VERSION = 4;
