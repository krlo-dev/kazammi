import { createFftPlan } from "./fft";
import { hann } from "./window";

export interface StftParams {
  windowSize: number; // power of 2
  hopSize: number;
}

export interface Spectrogram {
  readonly frames: number;
  readonly bins: number; // windowSize / 2 + 1
  readonly sampleRate: number;
  readonly windowSize: number;
  readonly hopSize: number;
  /** Linear magnitudes, row-major: data[frame * bins + bin]. */
  readonly data: Float32Array;
}

/**
 * Short-time Fourier transform of a mono signal with a Hann window.
 * Produces floor((L - N) / H) + 1 frames, or 0 frames when the signal is shorter than N.
 */
export function stft(signal: Float32Array, sampleRate: number, params: StftParams): Spectrogram {
  const { windowSize, hopSize } = params;
  if (!Number.isInteger(hopSize) || hopSize < 1) {
    throw new RangeError(`STFT hop size must be a positive integer, got ${hopSize}`);
  }
  if (!(sampleRate > 0)) {
    throw new RangeError(`STFT sample rate must be positive, got ${sampleRate}`);
  }

  // Validates windowSize (power of 2, >= 2) before anything else is allocated.
  const plan = createFftPlan(windowSize);
  const window = hann(windowSize);
  const bins = windowSize / 2 + 1;
  const frames =
    signal.length < windowSize ? 0 : Math.floor((signal.length - windowSize) / hopSize) + 1;
  const data = new Float32Array(frames * bins);

  // One pair of buffers for every frame: no allocations inside the loop.
  const re = new Float64Array(windowSize);
  const im = new Float64Array(windowSize);

  for (let frame = 0; frame < frames; frame++) {
    const offset = frame * hopSize;
    for (let n = 0; n < windowSize; n++) re[n] = signal[offset + n] * window[n];
    im.fill(0);
    plan.forward(re, im);
    const row = frame * bins;
    for (let k = 0; k < bins; k++) data[row + k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
  }

  return { frames, bins, sampleRate, windowSize, hopSize, data };
}

/** 20 * log10(magnitude), clamped at `epsilon` so silence gives a finite value. */
export function toDecibels(magnitude: number, epsilon = 1e-10): number {
  return 20 * Math.log10(Math.max(magnitude, epsilon));
}

/** Center frequency in Hz of FFT bin `bin`. */
export function binToHz(bin: number, sampleRate: number, windowSize: number): number {
  return (bin * sampleRate) / windowSize;
}

/** Start time in seconds of STFT frame `frame`. */
export function frameToSeconds(frame: number, sampleRate: number, hopSize: number): number {
  return (frame * hopSize) / sampleRate;
}
