import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";

import { authSchema, getDb, type Database } from "@/modules/db";
import { getServerEnv } from "@/shared";

import { hashPassword, verifyPassword } from "./password";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, nameSchema, normalizeEmail } from "./rules";

export interface AuthConfig {
  secret?: string;
  baseURL?: string;
}

export function createAuth(db: Database, config: AuthConfig = {}) {
  return betterAuth({
    ...config,
    database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
      // bcrypt instead of Better Auth's default scrypt (AUTH-R3).
      password: { hash: hashPassword, verify: verifyPassword },
    },
    databaseHooks: {
      user: {
        create: {
          // The server enforces the same name and email rules as the forms (AUTH-R1, R5).
          before: async (user) => {
            const name = nameSchema.safeParse(user.name);
            if (!name.success) {
              throw new APIError("BAD_REQUEST", { code: "INVALID_NAME", message: "Invalid name" });
            }
            return { data: { ...user, name: name.data, email: normalizeEmail(user.email) } };
          },
        },
      },
    },
    // On by default in production only. Counters live in Postgres: serverless instances
    // are short-lived, so in-memory counters would reset all the time (AUTH-R13).
    rateLimit: { storage: "database" },
    // Must be the last plugin: sets cookies from server actions.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

/**
 * Created on first use, not at import time, so `next build` and CI work without
 * credentials. BETTER_AUTH_SECRET and BETTER_AUTH_URL only come from the environment.
 */
export function getAuth(): Auth {
  if (!instance) {
    const env = getServerEnv();
    instance = createAuth(getDb(), {
      secret: env.BETTER_AUTH_SECRET,
      baseURL: env.BETTER_AUTH_URL,
    });
  }
  return instance;
}
