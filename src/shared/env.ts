import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (value) => /^postgres(ql)?:\/\//.test(value),
      "must be a postgres:// connection string",
    ),
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates a set of environment variables. Throws a readable error that names
 * the invalid variables without printing their values.
 */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment variables:\n${issues}`);
  }
  return result.data;
}

let cachedEnv: ServerEnv | undefined;

/**
 * Returns the validated server environment. Validation runs on the first call,
 * not at import time, so `next build` and CI work without real credentials.
 */
export function getServerEnv(): ServerEnv {
  cachedEnv ??= parseServerEnv(process.env);
  return cachedEnv;
}
