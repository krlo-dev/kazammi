import type { Spectrogram } from "@/modules/dsp";

import type { FingerprintParams } from "./params";

export interface Peak {
  frame: number;
  bin: number;
  magnitude: number;
}

/**
 * Band-based constellation map: in each frame, the loudest bin of every band is a peak
 * when it reaches peakAlpha times the mean of the band maxima and the silence threshold.
 * Peaks come out sorted by (frame, bin).
 */
export function findPeaks(spec: Spectrogram, params: FingerprintParams): Peak[] {
  const { bandEdges, peakAlpha, silenceThreshold } = params;
  const bandCount = bandEdges.length - 1;
  const maxBins = new Int32Array(bandCount);
  const maxValues = new Float64Array(bandCount);
  const peaks: Peak[] = [];

  for (let frame = 0; frame < spec.frames; frame++) {
    const row = frame * spec.bins;
    let sum = 0;
    let bands = 0;
    for (let band = 0; band < bandCount; band++) {
      const lo = bandEdges[band];
      const hi = Math.min(bandEdges[band + 1], spec.bins);
      maxBins[band] = -1;
      maxValues[band] = -1;
      for (let bin = lo; bin < hi; bin++) {
        // Strict > keeps the lowest bin on ties, so the result is deterministic.
        if (spec.data[row + bin] > maxValues[band]) {
          maxValues[band] = spec.data[row + bin];
          maxBins[band] = bin;
        }
      }
      if (maxBins[band] >= 0) {
        sum += maxValues[band];
        bands++;
      }
    }
    if (bands === 0) continue;

    const threshold = Math.max(peakAlpha * (sum / bands), silenceThreshold);
    for (let band = 0; band < bandCount; band++) {
      if (maxBins[band] >= 0 && maxValues[band] >= threshold) {
        peaks.push({ frame, bin: maxBins[band], magnitude: maxValues[band] });
      }
    }
  }

  return peaks;
}
