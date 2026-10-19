import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { UnauthorizedError } from "@/shared";

import { getAuth } from "./auth";

export interface User {
  id: string;
  name: string;
  email: string;
}

/** Validates the session cookie against the database. Null when there is no session. */
export async function getSession(): Promise<{ user: User } | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { user: { id, name, email } };
}

/** Pages and server actions: the signed-in user, or a redirect to /login. */
export async function requireUser(): Promise<User> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.user;
}

/** Route handlers: the signed-in user, or UnauthorizedError (answer 401). */
export async function requireUserForApi(): Promise<User> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session.user;
}

/** Turns UnauthorizedError into a 401 response; other errors propagate. */
export function withApiAuth<Args extends unknown[]>(
  handler: (user: User, ...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args) => {
    let user: User;
    try {
      user = await requireUserForApi();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      throw error;
    }
    return handler(user, ...args);
  };
}
