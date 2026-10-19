/** mulberry32: seeded PRNG (the same generator as the dsp tests), floats in [0, 1). */
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

/** Standard normal samples with the Box-Muller transform over a uniform PRNG. */
export function gaussian(uniform: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    // 1 - u keeps u1 in (0, 1], so log(u1) is finite.
    const u1 = 1 - uniform();
    const u2 = uniform();
    const radius = Math.sqrt(-2 * Math.log(u1));
    spare = radius * Math.sin(2 * Math.PI * u2);
    return radius * Math.cos(2 * Math.PI * u2);
  };
}

/** Mean power (1/N) sum x[n]^2. */
export function power(signal: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < signal.length; i++) sum += signal[i] * signal[i];
  return signal.length > 0 ? sum / signal.length : 0;
}

/** 10 log10(P_signal / P_noise). */
export function snrDb(signal: ArrayLike<number>, noisy: ArrayLike<number>): number {
  let noise = 0;
  for (let i = 0; i < signal.length; i++) noise += (noisy[i] - signal[i]) ** 2;
  return 10 * Math.log10(power(signal) / (noise / signal.length));
}

/**
 * White Gaussian noise with power P_signal / 10^(SNR / 10), added to a copy of `signal`.
 * SNR = Infinity returns an exact copy. The noise is rescaled to its exact target power,
 * so the measured SNR matches the requested one even for short segments.
 */
export function addNoise(
  signal: Float32Array,
  targetSnrDb: number,
  uniform: () => number,
): Float32Array {
  const out = Float32Array.from(signal);
  if (targetSnrDb === Infinity) return out;
  const normal = gaussian(uniform);
  const noise = Float64Array.from({ length: signal.length }, normal);
  const scale = Math.sqrt(power(signal) / 10 ** (targetSnrDb / 10) / power(noise));
  for (let i = 0; i < out.length; i++) out[i] = signal[i] + noise[i] * scale;
  return out;
}
