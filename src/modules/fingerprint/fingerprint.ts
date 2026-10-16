import { stft, type Spectrogram } from "@/modules/dsp";

import { buildHashes } from "./hash";
import { normalize } from "./normalize";
import { DEFAULT_PARAMS, type FingerprintParams } from "./params";
import { findPeaks, type Peak } from "./peaks";

export interface Fingerprint {
  /** hashes[i] and anchorFrames[i] form a pair. */
  hashes: Uint32Array;
  anchorFrames: Uint32Array;
}

export interface FingerprintDebug {
  spectrogram: Spectrogram;
  peaks: Peak[];
}

/** pcm (mono, 11,025 Hz) -> normalize -> stft -> findPeaks -> buildHashes. */
export function fingerprint(
  pcm: Float32Array,
  options?: { params?: FingerprintParams; debug?: false },
): Fingerprint;
export function fingerprint(
  pcm: Float32Array,
  options: { params?: FingerprintParams; debug: true },
): Fingerprint & { debug: FingerprintDebug };
export function fingerprint(
  pcm: Float32Array,
  options: { params?: FingerprintParams; debug?: boolean } = {},
): Fingerprint | (Fingerprint & { debug: FingerprintDebug }) {
  const params = options.params ?? DEFAULT_PARAMS;
  const spectrogram = stft(normalize(pcm), params.sampleRate, {
    windowSize: params.windowSize,
    hopSize: params.hopSize,
  });
  const peaks = findPeaks(spectrogram, params);
  const result = buildHashes(peaks, params);
  // The intermediates exist anyway; debug only decides whether they are returned.
  return options.debug ? { ...result, debug: { spectrogram, peaks } } : result;
}
