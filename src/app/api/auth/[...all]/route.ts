import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/modules/auth";

// Sign up, sign in, sign out and session endpoints of Better Auth (public: AUTH-R12).
// The auth instance is resolved per request so `next build` needs no credentials.
export const GET = (request: Request) => toNextJsHandler(getAuth()).GET(request);
export const POST = (request: Request) => toNextJsHandler(getAuth()).POST(request);
