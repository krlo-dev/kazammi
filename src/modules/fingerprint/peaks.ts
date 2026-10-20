import type { Spectrogram } from "@/modules/dsp";

import type { FingerprintParams } from "./params";

export interface Peak {
  frame: number;
  bin: number;
  magnitude: number;
}

/** Relative tolerance under which two magnitudes are a tie. */
const TIE = 1e-3;

/**
 * Constellation map from 2D local maxima: a bin is a peak when it is the largest value
 * within ±neighborhood.bins and ±neighborhood.frames (the first one on a tie), lies in
 * [minBin, maxBin), and is above peakFloorDb relative to the loudest bin of the
 * spectrogram. A peak survives only if fewer than maxPeaksPerSecond louder peaks lie
 * within ±half a second of it, which caps the density without depending on where the
 * signal starts. Peaks come out sorted by (frame, bin).
 */
export function findPeaks(spec: Spectrogram, params: FingerprintParams): Peak[] {
  const { neighborhood, minBin, peakFloorDb, maxPeaksPerSecond } = params;
  const { frames, bins, data } = spec;
  const maxBin = Math.min(params.maxBin, bins);

  let loudest = 0;
  for (let i = 0; i < data.length; i++) if (data[i] > loudest) loudest = data[i];
  // Strict > against the floor also rejects digital silence, where loudest is 0.
  const floor = loudest * 10 ** (peakFloorDb / 20);

  // Separable max filter: along frequency (every bin, the neighborhood of minBin reaches
  // below it), then along time (only the bins that can hold a peak).
  const alongBins = new Float32Array(frames * bins);
  for (let frame = 0; frame < frames; frame++) {
    const row = frame * bins;
    for (let bin = 0; bin < bins; bin++) {
      const lo = Math.max(0, bin - neighborhood.bins);
      const hi = Math.min(bins - 1, bin + neighborhood.bins);
      let max = data[row + lo];
      for (let j = lo + 1; j <= hi; j++) if (data[row + j] > max) max = data[row + j];
      alongBins[row + bin] = max;
    }
  }

  // Values within TIE of each other count as equal, so float rounding (a volume change, the
  // browser FFT path) cannot decide which bin of a plateau becomes the peak.
  const candidates: Peak[] = [];
  for (let frame = 0; frame < frames; frame++) {
    const lo = Math.max(0, frame - neighborhood.frames);
    const hi = Math.min(frames - 1, frame + neighborhood.frames);
    for (let bin = minBin; bin < maxBin; bin++) {
      const value = data[frame * bins + bin];
      if (!(value > floor)) continue;
      const limit = value * (1 + TIE);
      let isMax = true;
      for (let j = lo; j <= hi && isMax; j++) if (alongBins[j * bins + bin] > limit) isMax = false;
      if (isMax) candidates.push({ frame, bin, magnitude: value });
    }
  }

  // A plateau (a perfectly sustained note) yields one candidate per frame: keep the first,
  // dropping every candidate that ties with an earlier one inside its neighborhood.
  const maxima: Peak[] = [];
  let first = 0;
  for (let i = 0; i < candidates.length; i++) {
    const peak = candidates[i];
    while (candidates[first].frame < peak.frame - neighborhood.frames) first++;
    let tied = false;
    for (let j = first; j < i && !tied; j++) {
      const other = candidates[j];
      tied =
        Math.abs(other.bin - peak.bin) <= neighborhood.bins &&
        other.magnitude * (1 + TIE) >= peak.magnitude;
    }
    if (!tied) maxima.push(peak);
  }

  // Ties on magnitude go to the earlier (frame, bin), so the result is deterministic.
  const half = Math.round(spec.sampleRate / spec.hopSize / 2);
  const louder = (a: Peak, b: Peak) =>
    a.magnitude > b.magnitude ||
    (a.magnitude === b.magnitude && (a.frame < b.frame || (a.frame === b.frame && a.bin < b.bin)));
  const peaks: Peak[] = [];
  let start = 0;
  for (const peak of maxima) {
    while (maxima[start].frame < peak.frame - half) start++;
    let count = 0;
    for (let j = start; j < maxima.length && maxima[j].frame <= peak.frame + half; j++) {
      if (louder(maxima[j], peak) && ++count >= maxPeaksPerSecond) break;
    }
    if (count < maxPeaksPerSecond) peaks.push(peak);
  }
  return peaks;
}
