import { describe, expect, it } from "vitest";

import * as shared from "@/shared";

describe("test setup", () => {
  it("resolves the @/ alias to src/", () => {
    expect(shared).toBeTypeOf("object");
  });
});
