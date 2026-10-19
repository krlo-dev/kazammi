// "Room" condition of the offline evaluation: what a song goes through between a phone
// speaker and a microphone about 1 m away (specs/06-recognition, eval).
import { gaussian, mulberry32, power } from "./noise";

export interface RoomOptions {
  sampleRate: number;
  /** Signal-to-noise ratio of the pink background noise, after the speaker and the room. */
  snrDb: number;
  seed: number;
}

/** Speaker band: a phone speaker plays almost nothing below ~250 Hz or above ~4 kHz. */
const HIGHPASS_HZ = 250;
const LOWPASS_HZ = 4000;
/** Early reflections off walls and table: [delay in ms, gain]. */
const REFLECTIONS: ReadonlyArray<readonly [number, number]> = [
  [23, 0.5],
  [47, 0.35],
  [89, 0.25],
];
/** Late reverberation: a feedback comb on top of the reflections. */
const TAIL_MS = 137;
const TAIL_GAIN = 0.35;

/** RBJ biquad, applied in place (direct form I). */
function biquad(x: Float64Array, sampleRate: number, type: "highpass" | "lowpass", hz: number) {
  const w0 = (2 * Math.PI * hz) / sampleRate;
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const cos = Math.cos(w0);
  const b =
    type === "highpass"
      ? [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2]
      : [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  const a = [1 + alpha, -2 * cos, 1 - alpha];
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let n = 0; n < x.length; n++) {
    const x0 = x[n];
    const y0 = (b[0] * x0 + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2) / a[0];
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    x[n] = y0;
  }
}

/** Pink noise (-3 dB/octave) with Paul Kellet's filter over white Gaussian noise. */
function pinkNoise(length: number, seed: number): Float64Array {
  const normal = gaussian(mulberry32(seed));
  const out = new Float64Array(length);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let n = 0; n < length; n++) {
    const white = normal();
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    out[n] = b0 + b1 + b2 + white * 0.1848;
  }
  return out;
}

/** Speaker band, room reflections and reverb, then pink noise at an exact SNR. */
export function applyRoom(signal: Float32Array, options: RoomOptions): Float32Array {
  const { sampleRate, snrDb, seed } = options;
  const dry = Float64Array.from(signal);
  biquad(dry, sampleRate, "highpass", HIGHPASS_HZ);
  biquad(dry, sampleRate, "lowpass", LOWPASS_HZ);

  const wet = Float64Array.from(dry);
  for (const [ms, gain] of REFLECTIONS) {
    const delay = Math.round((ms / 1000) * sampleRate);
    for (let n = delay; n < wet.length; n++) wet[n] += gain * dry[n - delay];
  }
  const tail = Math.round((TAIL_MS / 1000) * sampleRate);
  for (let n = tail; n < wet.length; n++) wet[n] += TAIL_GAIN * wet[n - tail];

  const out = new Float32Array(signal.length);
  const noise = pinkNoise(signal.length, seed);
  const signalPower = power(wet);
  const scale =
    snrDb === Infinity || signalPower === 0
      ? 0
      : Math.sqrt(signalPower / 10 ** (snrDb / 10) / power(noise));
  for (let n = 0; n < out.length; n++) out[n] = wet[n] + noise[n] * scale;
  return out;
}
