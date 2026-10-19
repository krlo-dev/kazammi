import { existsSync } from "node:fs";

import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read env files on its own. Same precedence as Next.js: .env.local, then .env.
for (const file of [".env.local", ".env"]) {
  if (!process.env.DATABASE_URL && existsSync(file)) process.loadEnvFile(file);
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
