import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { config, proxy } from "../proxy";

const request = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: cookie ? { cookie } : {},
  });

const SESSION = "better-auth.session_token=abc.def";

/** Same test Next.js applies with config.matcher. */
const matches = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe("proxy", () => {
  it("redirects to /login keeping the destination when there is no session cookie", () => {
    const response = proxy(request("/saved"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fsaved");
  });

  it("keeps the query string of the destination", () => {
    const response = proxy(request("/playlists/3?tab=songs"));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/playlists/3?tab=songs");
  });

  it("sends / to /login without a next parameter", () => {
    expect(proxy(request("/")).headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets requests with a session cookie through", () => {
    expect(proxy(request("/saved", SESSION)).headers.get("location")).toBeNull();
    expect(proxy(request("/saved", `__Secure-${SESSION}`)).headers.get("location")).toBeNull();
  });

  it("never redirects /login itself (the page checks the session)", () => {
    expect(proxy(request("/login")).headers.get("location")).toBeNull();
    expect(proxy(request("/login", SESSION)).headers.get("location")).toBeNull();
  });

  it.each(["/", "/saved", "/playlists/3", "/login", "/how-it-works"])("runs on %s", (path) => {
    expect(matches(path)).toBe(true);
  });

  it.each([
    "/api/auth/sign-in/email",
    "/api/health",
    "/api/recognize",
    "/api/tracks/1/cover",
    "/_next/static/chunk.js",
    "/favicon.ico",
    "/brand/logo.svg",
    "/loader.webp",
  ])("skips %s (public or answers 401 itself)", (path) => {
    expect(matches(path)).toBe(false);
  });
});
