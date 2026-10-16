import { beforeEach, describe, expect, it, vi } from "vitest";

import { UnauthorizedError } from "@/shared";

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string; name: string; email: string; image: null } },
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock("../auth", () => ({
  getAuth: () => ({ api: { getSession: async () => state.session } }),
}));

const { getSession, requireUser, requireUserForApi, withApiAuth } = await import("../session");

const ANA = { id: "u1", name: "Ana", email: "ana@example.com" };

describe("session helpers", () => {
  beforeEach(() => {
    state.session = null;
  });

  it("returns only id, name and email of the signed-in user", async () => {
    state.session = { user: { ...ANA, image: null } };
    expect(await getSession()).toEqual({ user: ANA });
    expect(await requireUser()).toEqual(ANA);
    expect(await requireUserForApi()).toEqual(ANA);
  });

  it("requireUser redirects to /login without a session", async () => {
    await expect(requireUser()).rejects.toThrow("NEXT_REDIRECT /login");
  });

  it("requireUserForApi throws UnauthorizedError without a session", async () => {
    await expect(requireUserForApi()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("withApiAuth answers 401 without a session and passes the user otherwise", async () => {
    const handler = withApiAuth(async (user, id: number) => Response.json({ user, id }));
    const denied = await handler(7);
    expect(denied.status).toBe(401);
    expect(await denied.json()).toEqual({ error: "unauthorized" });

    state.session = { user: { ...ANA, image: null } };
    expect(await (await handler(7)).json()).toEqual({ user: ANA, id: 7 });
  });

  it("withApiAuth lets other errors propagate", async () => {
    state.session = { user: { ...ANA, image: null } };
    const handler = withApiAuth(async () => {
      throw new Error("boom");
    });
    await expect(handler()).rejects.toThrow("boom");
  });
});
