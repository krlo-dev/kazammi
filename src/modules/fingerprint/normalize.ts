/**
 * Peak normalization: scales the signal so its largest absolute sample is 1.0.
 * Returns a new array; an all-zero signal comes back as zeros.
 */
export function normalize(pcm: Float32Array): Float32Array {
  let peak = 0;
  for (let i = 0; i < pcm.length; i++) {
    const value = Math.abs(pcm[i]);
    if (value > peak) peak = value;
  }
  const out = new Float32Array(pcm.length);
  if (peak === 0) return out;
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / peak;
  return out;
}
