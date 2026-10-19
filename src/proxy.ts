import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect: only checks that a session cookie exists, without touching the
 * database. Pages and server actions validate the session for real with requireUser().
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = getSessionCookie(request) !== null;
  const isLogin = pathname === "/login";

  if (!hasSession && !isLogin) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  // A signed-in user opening /login is sent to / by the login page itself, after a real
  // session check: doing it here with a stale cookie would loop between / and /login.
  return NextResponse.next();
}

export const config = {
  // Everything except API routes (they answer 401 themselves, a redirect would break fetch),
  // Next internals and public static files (AUTH-R12).
  matcher: ["/((?!api/|_next/|brand/|favicon|icon|.*\.(?:svg|png|webp|ico|jpg|txt|xml)$).*)"],
};
