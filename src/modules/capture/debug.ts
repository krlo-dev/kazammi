import type { Spectrogram } from "@/modules/dsp";
import { DEFAULT_PARAMS, encodeHash, type Peak } from "@/modules/fingerprint";

import type { AttemptResult } from "./attempts";

export interface RecognizerDebug {
  /** PCM at 11,025 Hz reduced to (min, max) pairs per block, interleaved. */
  waveform: Float32Array;
  spectrogram: Spectrogram;
  peaks: Peak[];
  /** [delta, count] of the winning track, only when the attempt matched. */
  histogram?: Array<[delta: number, count: number]>;
  /** One anchor with its target zone and the hashes it produced, to show how pairs form. */
  hashExample: HashExample | null;
}

export interface HashExample {
  anchor: Peak;
  /** Frames and bins of the target zone Z(a), inclusive. */
  zone: { fromFrame: number; toFrame: number; fromBin: number; toBin: number };
  pairs: Array<{ point: Peak; deltaFrames: number; hash: number }>;
}

export const WAVEFORM_POINTS = 2000;

/** Min and max of each of points / 2 blocks: keeps the envelope of the signal for drawing. */
export function downsampleMinMax(pcm: Float32Array, points = WAVEFORM_POINTS): Float32Array {
  const blocks = Math.min(Math.floor(points / 2), pcm.length);
  const out = new Float32Array(blocks * 2);
  for (let b = 0; b < blocks; b++) {
    const from = Math.floor((b * pcm.length) / blocks);
    const to = Math.floor(((b + 1) * pcm.length) / blocks);
    let min = Infinity;
    let max = -Infinity;
    for (let i = from; i < to; i++) {
      if (pcm[i] < min) min = pcm[i];
      if (pcm[i] > max) max = pcm[i];
    }
    out[2 * b] = min;
    out[2 * b + 1] = max;
  }
  return out;
}

/**
 * The loudest anchor whose target zone yields a full fan-out, paired exactly like
 * buildHashes does (same zone, same fan-out, same 32-bit layout).
 */
export function pickHashExample(peaks: Peak[], params = DEFAULT_PARAMS): HashExample | null {
  const { minDeltaFrames, maxDeltaFrames, maxDeltaBins, fanOut } = params.targetZone;
  let best: HashExample | null = null;
  for (let i = 0; i < peaks.length; i++) {
    const anchor = peaks[i];
    if (best && anchor.magnitude <= best.anchor.magnitude) continue;
    const pairs: HashExample["pairs"] = [];
    for (let j = i + 1; j < peaks.length && pairs.length < fanOut; j++) {
      const point = peaks[j];
      const deltaFrames = point.frame - anchor.frame;
      if (deltaFrames > maxDeltaFrames) break;
      if (deltaFrames < minDeltaFrames) continue;
      if (Math.abs(point.bin - anchor.bin) > maxDeltaBins) continue;
      pairs.push({ point, deltaFrames, hash: encodeHash(anchor.bin, point.bin, deltaFrames) });
    }
    if (pairs.length < fanOut) continue;
    best = {
      anchor,
      zone: {
        fromFrame: anchor.frame + minDeltaFrames,
        toFrame: anchor.frame + maxDeltaFrames,
        fromBin: Math.max(0, anchor.bin - maxDeltaBins),
        toBin: anchor.bin + maxDeltaBins,
      },
      pairs,
    };
  }
  return best;
}

/** Debug data of an attempt for the explanatory view (CAP-R10), or null without debug. */
export function toRecognizerDebug(attempt: AttemptResult): RecognizerDebug | null {
  if (!attempt.debug) return null;
  const { response } = attempt;
  return {
    waveform: downsampleMinMax(attempt.pcm),
    spectrogram: attempt.debug.spectrogram,
    peaks: attempt.debug.peaks,
    histogram: response.status === "match" ? response.debug?.histogram : undefined,
    hashExample: pickHashExample(attempt.debug.peaks),
  };
}
