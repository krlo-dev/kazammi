import { describe, expect, it } from "vitest";

import * as dsp from "../index";

describe("dsp public api", () => {
  it("exposes exactly the runtime functions listed in design.md", () => {
    expect(Object.keys(dsp).sort()).toEqual([
      "binToHz",
      "createFftPlan",
      "dft",
      "frameToSeconds",
      "hann",
      "stft",
      "toDecibels",
    ]);
  });
});
