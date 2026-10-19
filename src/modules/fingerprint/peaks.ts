import type { Spectrogram } from "@/modules/dsp";

import type { FingerprintParams } from "./params";

export interface Peak {
  frame: number;
  bin: number;
  magnitude: number;
}

/**
 * Band-based constellation map: in each frame, the loudest bin of every band is a peak
 * when it reaches peakAlpha times the mean of the band maxima and the silence threshold,
 * and when it is a note onset: the band had no such peak within ±peakContinuityBins bins
 * in the previous frame. Peaks come out sorted by (frame, bin).
 */
export function findPeaks(spec: Spectrogram, params: FingerprintParams): Peak[] {
  const { bandEdges, peakAlpha, silenceThreshold, peakContinuityBins } = params;
  const bandCount = bandEdges.length - 1;
  const maxBins = new Int32Array(bandCount);
  const maxValues = new Float64Array(bandCount);
  // Bin of the band's thresholded peak in the previous frame (-1 when it had none). It is
  // tracked before the onset check, so a sustained note keeps suppressing itself.
  let previousBins = new Int32Array(bandCount).fill(-1);
  let currentBins = new Int32Array(bandCount);
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

    currentBins.fill(-1);
    if (bands > 0) {
      const threshold = Math.max(peakAlpha * (sum / bands), silenceThreshold);
      for (let band = 0; band < bandCount; band++) {
        const bin = maxBins[band];
        if (bin < 0 || maxValues[band] < threshold) continue;
        currentBins[band] = bin;
        const previous = previousBins[band];
        if (previous < 0 || Math.abs(bin - previous) > peakContinuityBins) {
          peaks.push({ frame, bin, magnitude: maxValues[band] });
        }
      }
    }
    [previousBins, currentBins] = [currentBins, previousBins];
  }

  return peaks;
}
