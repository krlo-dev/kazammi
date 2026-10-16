import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "scripts/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/modules/**/*.ts", "src/shared/**/*.ts"],
      exclude: ["**/__tests__/**"],
    },
  },
});
