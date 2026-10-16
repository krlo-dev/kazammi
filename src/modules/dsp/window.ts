/**
 * Symmetric Hann window: w[n] = 0.5 * (1 - cos(2 pi n / (N - 1))).
 * Starts and ends at 0 and peaks at 1 in the middle (exactly at the center for odd N).
 */
export function hann(size: number): Float64Array {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`Window size must be a positive integer, got ${size}`);
  }
  const out = new Float64Array(size);
  if (size === 1) {
    out[0] = 1;
    return out;
  }
  for (let n = 0; n < size; n++) {
    out[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (size - 1)));
  }
  return out;
}
