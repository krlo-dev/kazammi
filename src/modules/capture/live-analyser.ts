import { createFftPlan, hann, toDecibels } from "@/modules/dsp";

export interface RecognizerLive {
  /** RMS of the last window, 0..1. */
  level: number;
  /** Magnitudes in dB normalized to 0..1, one value per log-spaced band. */
  spectrum: Float32Array;
}

export const LIVE_FFT_SIZE = 1024;
export const LIVE_BANDS = 128;
const MIN_HZ = 60;
const MAX_HZ = 8000;
/** Floor of the display: this many dB below a full-scale sine maps to 0. */
const DB_RANGE = 90;

export interface LiveAnalyser {
  /** `samples` are the last LIVE_FFT_SIZE samples of the recording. */
  analyse(samples: Float32Array): RecognizerLive;
}

/**
 * Live spectrum with the project FFT (CAP-R9): Hann window, 1024 points, magnitudes
 * grouped into 128 log-spaced bands between 60 Hz and 8 kHz (or Nyquist).
 */
export function createLiveAnalyser(sampleRate: number): LiveAnalyser {
  const size = LIVE_FFT_SIZE;
  const plan = createFftPlan(size);
  const window = hann(size);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  // A full-scale sine on a bin center peaks at sum(window) / 2 under the window.
  const fullScale = window.reduce((sum, w) => sum + w, 0) / 2;

  // [first, last] FFT bin of every band. Narrow low bands may share one bin.
  const binHz = sampleRate / size;
  const topHz = Math.min(MAX_HZ, sampleRate / 2);
  const lastBin = size / 2;
  const firstBins = new Int32Array(LIVE_BANDS);
  const lastBins = new Int32Array(LIVE_BANDS);
  for (let band = 0; band < LIVE_BANDS; band++) {
    const lo = MIN_HZ * (topHz / MIN_HZ) ** (band / LIVE_BANDS);
    const hi = MIN_HZ * (topHz / MIN_HZ) ** ((band + 1) / LIVE_BANDS);
    const first = Math.min(lastBin, Math.round(lo / binHz));
    firstBins[band] = first;
    lastBins[band] = Math.min(lastBin, Math.max(first, Math.round(hi / binHz) - 1));
  }

  return {
    analyse(samples) {
      if (samples.length !== size) {
        throw new RangeError(`Live analyser expects ${size} samples, got ${samples.length}`);
      }
      let energy = 0;
      for (let n = 0; n < size; n++) {
        energy += samples[n] * samples[n];
        re[n] = samples[n] * window[n];
      }
      im.fill(0);
      plan.forward(re, im);

      const spectrum = new Float32Array(LIVE_BANDS);
      for (let band = 0; band < LIVE_BANDS; band++) {
        let max = 0;
        for (let k = firstBins[band]; k <= lastBins[band]; k++) {
          max = Math.max(max, Math.hypot(re[k], im[k]));
        }
        const db = toDecibels(max / fullScale);
        spectrum[band] = Math.min(1, Math.max(0, 1 + db / DB_RANGE));
      }
      return { level: Math.min(1, Math.sqrt(energy / size)), spectrum };
    },
  };
}
