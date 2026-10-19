import { describe, expect, test } from "vitest";

import { createFftPlan } from "../fft";
import { stft } from "../stft";
import { randomSignal } from "./helpers";

const SAMPLE_RATE = 11025;

describe("dsp benchmarks", () => {
  test("fft forward, N = 1024", async ({ bench }) => {
    const plan = createFftPlan(1024);
    const source = randomSignal(1024, 1);
    const re = new Float64Array(1024);
    const im = new Float64Array(1024);

    await bench("fft forward, N = 1024", () => {
      re.set(source);
      im.fill(0);
      plan.forward(re, im);
    }).run();
  });

  // DSP-R10: 10 s of audio at 11,025 Hz must take < 50 ms.
  test("stft of 10 s at 11,025 Hz, N = 1024, H = 512", async ({ bench }) => {
    const signal = Float32Array.from(randomSignal(SAMPLE_RATE * 10, 2));

    const result = await bench("stft 10 s", () => {
      stft(signal, SAMPLE_RATE, { windowSize: 1024, hopSize: 512 });
    }).run();

    expect(result.latency.mean).toBeLessThan(50);
  });
});
