import { describe, expect, it } from "vitest";

import { safeNextPath } from "../next-path";
import { signInSchema, signUpSchema } from "../rules";

describe("safeNextPath", () => {
  it.each(["/", "/saved", "/playlists/3", "/saved?tab=recent", "/a/b#c"])(
    "keeps the internal path %s",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    undefined,
    null,
    "",
    "saved",
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "javascript:alert(1)",
    "/login",
    "/login?next=/saved",
  ])("falls back to / for %s", (path) => {
    expect(safeNextPath(path)).toBe("/");
  });

  it("uses the first value when the query param repeats", () => {
    expect(safeNextPath(["/saved", "//evil.com"])).toBe("/saved");
    expect(safeNextPath(["//evil.com", "/saved"])).toBe("/");
  });
});

describe("account rules", () => {
  const valid = { name: "Ana", email: "ana@example.com", password: "12345678" };

  it("normalizes email and name", () => {
    expect(signUpSchema.parse({ ...valid, name: "  Ana  ", email: "  Ana@Example.COM " })).toEqual({
      ...valid,
      name: "Ana",
    });
  });

  it.each([
    [{ name: "" }, "Escribe tu nombre"],
    [{ name: "   " }, "Escribe tu nombre"],
    [{ name: "x".repeat(61) }, "El nombre debe tener como máximo 60 caracteres"],
    [{ email: "ana" }, "El correo no es válido"],
    [{ password: "1234567" }, "La contraseña debe tener al menos 8 caracteres"],
    [{ password: "x".repeat(65) }, "La contraseña debe tener como máximo 64 caracteres"],
  ])("rejects %o with a Spanish message", (override, message) => {
    const result = signUpSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });

  it("accepts the length limits", () => {
    expect(
      signUpSchema.safeParse({ ...valid, name: "x".repeat(60), password: "x".repeat(64) }).success,
    ).toBe(true);
  });

  it("sign in only requires a non-empty password", () => {
    expect(signInSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
