// Deterministic synthetic signals for the fingerprint tests (no audio files in the repo).

export const SAMPLE_RATE = 11025;

/** mulberry32 seeded PRNG, floats in [0, 1). */
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

export function whiteNoise(length: number, seed: number, amplitude = 1): Float32Array {
  const next = mulberry32(seed);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = amplitude * (next() * 2 - 1);
  return out;
}

/** Sum of sines whose frequencies sit exactly on FFT bin centers (N = 1024). */
export function binSines(length: number, bins: readonly number[], amplitude: number): Float32Array {
  const out = new Float32Array(length);
  for (let n = 0; n < length; n++) {
    let value = 0;
    for (const bin of bins) value += Math.sin((2 * Math.PI * bin * n) / 1024);
    out[n] = amplitude * value;
  }
  return out;
}

/**
 * Mix of 3 sines whose frequencies (200 Hz to 4 kHz) change every 0.5 s, chosen by a
 * seeded PRNG: a cheap stand-in for music with a moving spectrum.
 */
export function melody(seconds: number, seed: number): Float32Array {
  const next = mulberry32(seed);
  const length = Math.round(seconds * SAMPLE_RATE);
  const segment = Math.round(0.5 * SAMPLE_RATE);
  const out = new Float32Array(length);
  let freqs = [0, 0, 0];
  for (let n = 0; n < length; n++) {
    if (n % segment === 0) freqs = freqs.map(() => 200 + next() * 3800);
    let value = 0;
    for (const f of freqs) value += Math.sin((2 * Math.PI * f * n) / SAMPLE_RATE);
    out[n] = value / 3;
  }
  return out;
}
