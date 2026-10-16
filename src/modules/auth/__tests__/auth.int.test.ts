import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { account, user, type Database } from "@/modules/db";
import { createTestDb } from "@/modules/db/testing";

import { createAuth, type Auth } from "../auth";

// nextCookies() writes cookies through next/headers, which only exists inside a request.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: async () => new Headers(),
}));

const BODY = { name: "Ana Pérez", email: "ana@example.com", password: "una-clave-segura" };

async function errorOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const e = error as { status?: string; body?: { code?: string; message?: string } };
    return { status: e.status, code: e.body?.code, message: e.body?.message };
  }
  throw new Error("expected the call to fail");
}

describe("Better Auth with bcrypt (PGlite)", () => {
  let db: Database;
  let close: () => Promise<void>;
  let auth: Auth;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    auth = createAuth(db, {
      secret: "test-secret-with-at-least-32-characters!",
      baseURL: "http://localhost:3000",
    });
  });
  afterEach(() => close());

  it("signs up: one user row and one credential account with a bcrypt cost-12 hash", async () => {
    const result = await auth.api.signUpEmail({ body: BODY });
    expect(result.token).toBeTruthy(); // autoSignIn (AUTH-R7)

    const [row] = await db.select().from(user);
    expect(row).toMatchObject({ name: "Ana Pérez", email: "ana@example.com" });
    const accounts = await db.select().from(account).where(eq(account.userId, row.id));
    expect(accounts).toHaveLength(1);
    expect(accounts[0].providerId).toBe("credential");
    expect(accounts[0].password).toMatch(/^\$2[ab]\$12\$/);
    expect(accounts[0].password).not.toContain(BODY.password);
  });

  it("stores the email trimmed and lowercased and rejects the same email in other case", async () => {
    await auth.api.signUpEmail({ body: { ...BODY, email: "Ana@Example.com" } });
    expect((await db.select().from(user))[0].email).toBe("ana@example.com");

    const duplicate = await errorOf(
      auth.api.signUpEmail({ body: { ...BODY, email: "ANA@EXAMPLE.COM" } }),
    );
    expect(duplicate.code).toMatch(/^USER_ALREADY_EXISTS/);
    expect(await db.$count(user)).toBe(1);
  });

  it("signs in with the right password", async () => {
    await auth.api.signUpEmail({ body: BODY });
    const result = await auth.api.signInEmail({
      body: { email: "ANA@example.com", password: BODY.password },
    });
    expect(result.user.email).toBe("ana@example.com");
    expect(result.token).toBeTruthy();
  });

  it("answers exactly the same for an unknown email and a wrong password (AUTH-R6)", async () => {
    await auth.api.signUpEmail({ body: BODY });
    const wrongPassword = await errorOf(
      auth.api.signInEmail({ body: { email: BODY.email, password: "otra-clave-mala" } }),
    );
    const unknownEmail = await errorOf(
      auth.api.signInEmail({ body: { email: "nadie@example.com", password: BODY.password } }),
    );
    expect(wrongPassword).toEqual(unknownEmail);
    expect(wrongPassword.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });

  it.each([
    [{ password: "1234567" }, "PASSWORD_TOO_SHORT"],
    [{ password: "x".repeat(65) }, "PASSWORD_TOO_LONG"],
    [{ name: "x".repeat(61) }, "INVALID_NAME"],
    [{ name: "   " }, "INVALID_NAME"],
  ])("rejects %o with %s", async (override, code) => {
    const error = await errorOf(auth.api.signUpEmail({ body: { ...BODY, ...override } }));
    expect(error.code).toBe(code);
    expect(await db.$count(user)).toBe(0);
  });

  it("trims the name on sign up", async () => {
    await auth.api.signUpEmail({ body: { ...BODY, name: "  Ana  " } });
    expect((await db.select().from(user))[0].name).toBe("Ana");
  });

  it("resolves the session from the cookie it sets", async () => {
    const { headers } = await auth.api.signUpEmail({ body: BODY, returnHeaders: true });
    const cookie = headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    expect(cookie).toMatch(/better-auth\.session_token=/);

    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user.email).toBe(BODY.email);
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
  });
});
