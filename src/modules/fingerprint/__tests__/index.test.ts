import { describe, expect, it } from "vitest";

import * as fp from "../index";

describe("fingerprint public api", () => {
  it("exposes exactly the runtime values listed in design.md", () => {
    expect(Object.keys(fp).sort()).toEqual([
      "DEFAULT_PARAMS",
      "FINGERPRINT_VERSION",
      "decodeHash",
      "encodeHash",
      "fingerprint",
    ]);
  });
});
