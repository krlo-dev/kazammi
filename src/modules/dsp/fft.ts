/** Reusable plan for a fixed size N. */
export interface FftPlan {
  readonly size: number;
  /** Transforms in-place. re.length === im.length === size. */
  forward(re: Float64Array, im: Float64Array): void;
}

function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n >= 2 && (n & (n - 1)) === 0;
}

/** rev[i] is i with its log2(size) bits reversed. */
function bitReversalTable(size: number): Uint32Array {
  const bits = Math.log2(size);
  const rev = new Uint32Array(size);
  for (let i = 1; i < size; i++) {
    rev[i] = (rev[i >> 1] >> 1) | ((i & 1) << (bits - 1));
  }
  return rev;
}

/**
 * Precomputes the bit-reversal table and the twiddles cos(2 pi k / N), sin(2 pi k / N)
 * for k in [0, N/2) so every transform of this size reuses them.
 */
export function createFftPlan(size: number): FftPlan {
  if (!isPowerOfTwo(size)) {
    throw new RangeError(`FFT size must be a power of 2 and >= 2, got ${size}`);
  }

  const rev = bitReversalTable(size);
  const half = size / 2;
  const cosTable = new Float64Array(half);
  const sinTable = new Float64Array(half);
  for (let k = 0; k < half; k++) {
    const angle = (2 * Math.PI * k) / size;
    cosTable[k] = Math.cos(angle);
    sinTable[k] = Math.sin(angle);
  }

  function forward(re: Float64Array, im: Float64Array): void {
    if (re.length !== size || im.length !== size) {
      throw new RangeError(
        `FFT plan of size ${size} got re.length=${re.length}, im.length=${im.length}`,
      );
    }

    // Reorder the input so the butterflies can work in-place.
    for (let i = 0; i < size; i++) {
      const j = rev[i];
      if (i < j) {
        const tr = re[i];
        re[i] = re[j];
        re[j] = tr;
        const ti = im[i];
        im[i] = im[j];
        im[j] = ti;
      }
    }

    // Iterative Cooley-Tukey: merge DFTs of length span/2 into DFTs of length span.
    for (let span = 2; span <= size; span <<= 1) {
      const halfSpan = span >> 1;
      const step = size / span;
      for (let start = 0; start < size; start += span) {
        for (let j = 0; j < halfSpan; j++) {
          const wr = cosTable[j * step];
          const wi = -sinTable[j * step];
          const a = start + j;
          const b = a + halfSpan;
          const tr = wr * re[b] - wi * im[b];
          const ti = wr * im[b] + wi * re[b];
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
  }

  return { size, forward };
}
