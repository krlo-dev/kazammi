import { describe, expect, it } from "vitest";

import { BCRYPT_COST, hashPassword, verifyPassword } from "../password";

describe("bcrypt password hashing", () => {
  it("produces a bcrypt hash with cost 12 that verifies", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(BCRYPT_COST).toBe(12);
    expect(hash).toMatch(/^\$2[ab]\$12\$[./A-Za-z0-9]{53}$/);
    expect(await verifyPassword({ hash, password: "correct horse battery" })).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("secret-password");
    expect(await verifyPassword({ hash, password: "secret-passworD" })).toBe(false);
    expect(await verifyPassword({ hash, password: "" })).toBe(false);
  });

  it("salts every hash", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same-password"),
      hashPassword("same-password"),
    ]);
    expect(a).not.toBe(b);
  });
});
