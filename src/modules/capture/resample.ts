import { DEFAULT_PARAMS } from "@/modules/fingerprint";

/** Rate the fingerprint expects (11,025 Hz). */
export const TARGET_SAMPLE_RATE = DEFAULT_PARAMS.sampleRate;

/** Samples of `length` at `fromRate` once converted to `toRate`. */
export function resampledLength(length: number, fromRate: number, toRate: number): number {
  return Math.round((length * toRate) / fromRate);
}

/**
 * Resamples mono PCM with an OfflineAudioContext (CAP-R3): the browser resampler
 * low-pass filters before decimating, so frequencies above the new Nyquist do not alias.
 */
export async function resample(
  pcm: Float32Array,
  fromRate: number,
  toRate: number = TARGET_SAMPLE_RATE,
): Promise<Float32Array> {
  if (fromRate === toRate) return pcm.slice();
  const length = resampledLength(pcm.length, fromRate, toRate);
  if (length === 0) return new Float32Array(0);

  const context = new OfflineAudioContext(1, length, toRate);
  const input = context.createBuffer(1, pcm.length, fromRate);
  input.getChannelData(0).set(pcm);
  const source = context.createBufferSource();
  source.buffer = input;
  source.connect(context.destination);
  source.start();
  const rendered = await context.startRendering();
  return rendered.getChannelData(0).slice();
}
