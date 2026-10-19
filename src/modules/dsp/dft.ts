/**
 * Direct O(N^2) discrete Fourier transform:
 *   X[k] = sum_{n=0}^{N-1} x[n] * e^{-j 2 pi k n / N}
 *
 * Reference implementation for the FFT tests and the explanatory view.
 * Does not mutate its inputs and accepts any N >= 1.
 */
export function dft(re: Float64Array, im: Float64Array): { re: Float64Array; im: Float64Array } {
  if (re.length !== im.length) {
    throw new RangeError(`dft: re and im must have the same length (${re.length} vs ${im.length})`);
  }
  const size = re.length;
  const outRe = new Float64Array(size);
  const outIm = new Float64Array(size);
  for (let k = 0; k < size; k++) {
    let sumRe = 0;
    let sumIm = 0;
    for (let n = 0; n < size; n++) {
      // Reduce k*n mod N first so the angle stays small and accurate for large N.
      const angle = (-2 * Math.PI * ((k * n) % size)) / size;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      sumRe += re[n] * cos - im[n] * sin;
      sumIm += re[n] * sin + im[n] * cos;
    }
    outRe[k] = sumRe;
    outIm[k] = sumIm;
  }
  return { re: outRe, im: outIm };
}
