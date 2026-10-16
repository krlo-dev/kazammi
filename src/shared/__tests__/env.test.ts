import { describe, expect, it } from "vitest";

import { parseServerEnv } from "@/shared";

const validEnv = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/kazammi?sslmode=require",
  BETTER_AUTH_SECRET: "x".repeat(44),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("parseServerEnv", () => {
  it("returns the variables when they are valid", () => {
    expect(parseServerEnv(validEnv)).toEqual(validEnv);
  });

  it("names every missing variable", () => {
    expect(() => parseServerEnv({})).toThrow(
      /DATABASE_URL[\s\S]*BETTER_AUTH_SECRET[\s\S]*BETTER_AUTH_URL/,
    );
  });

  it("rejects a database url that is not postgres", () => {
    expect(() => parseServerEnv({ ...validEnv, DATABASE_URL: "mysql://localhost/db" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects a short auth secret without printing its value", () => {
    const secret = "too-short-secret";
    expect(() => parseServerEnv({ ...validEnv, BETTER_AUTH_SECRET: secret })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
    expect(() => parseServerEnv({ ...validEnv, BETTER_AUTH_SECRET: secret })).not.toThrow(secret);
  });
});
