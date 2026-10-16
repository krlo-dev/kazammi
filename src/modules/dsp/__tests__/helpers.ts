// Deterministic signal generators shared by the dsp tests and benchmarks.

/**
 * mulberry32: small seeded PRNG. Returns a function that yields floats in [0, 1).
 * The same seed always produces the same sequence, so test failures reproduce.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform random samples in [-1, 1). */
export function randomSignal(length: number, seed: number): Float64Array {
  const next = mulberry32(seed);
  const out = new Float64Array(length);
  for (let i = 0; i < length; i++) out[i] = next() * 2 - 1;
  return out;
}

/** Unit impulse: 1 at `position`, 0 elsewhere. */
export function impulse(length: number, position = 0): Float64Array {
  const out = new Float64Array(length);
  out[position] = 1;
  return out;
}

/** Constant signal with value `value`. */
export function constant(length: number, value: number): Float64Array {
  return new Float64Array(length).fill(value);
}

/** Sine with exactly `cycles` periods in `length` samples (lands on bin `cycles`). */
export function sineCycles(length: number, cycles: number, amplitude = 1): Float64Array {
  const out = new Float64Array(length);
  for (let n = 0; n < length; n++)
    out[n] = amplitude * Math.sin((2 * Math.PI * cycles * n) / length);
  return out;
}

/** Sine of `frequency` Hz sampled at `sampleRate`, as audio-like Float32 samples. */
export function sineHz(
  frequency: number,
  sampleRate: number,
  length: number,
  amplitude = 1,
): Float32Array {
  const out = new Float32Array(length);
  for (let n = 0; n < length; n++) {
    out[n] = amplitude * Math.sin((2 * Math.PI * frequency * n) / sampleRate);
  }
  return out;
}
