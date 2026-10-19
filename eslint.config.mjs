import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

// Module dependency map from specs/01-platform/design.md.
// Key: element type. Value: element types it may import.
const allowedDependencies = {
  shared: [],
  dsp: [],
  fingerprint: ["dsp"],
  capture: ["fingerprint", "dsp", "shared"],
  db: ["shared"],
  auth: ["db", "shared"],
  catalog: ["db", "shared"],
  recognition: ["catalog", "fingerprint", "shared"],
  library: ["db", "catalog", "shared"],
  app: [
    "shared",
    "dsp",
    "fingerprint",
    "capture",
    "db",
    "auth",
    "catalog",
    "recognition",
    "library",
  ],
  scripts: ["fingerprint", "catalog", "db", "dsp", "recognition", "shared"],
};

const modules = [
  "dsp",
  "fingerprint",
  "capture",
  "db",
  "auth",
  "catalog",
  "recognition",
  "library",
];

// Public entry points: a module is only imported through its index.ts
// (plus auth/client.ts for the browser auth client and db/testing.ts for tests).
const extraEntryPoints = { auth: ["client.ts"], db: ["testing.ts"] };
const entryPoint = (type) => ({
  type,
  fileInternalPath: ["index.ts", ...(extraEntryPoints[type] ?? [])],
});

const toSelector = (type) => (modules.includes(type) ? entryPoint(type) : { type });

// dsp and fingerprint are pure isomorphic TypeScript: no framework or runtime APIs.
const pureModules = ["dsp", "fingerprint"];
const forbiddenInPureModules = ["react", "react-dom", "next", "server-only", "client-only"];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.json" },
      },
      "boundaries/elements": [
        { type: "shared", pattern: "src/shared" },
        ...modules.map((type) => ({ type, pattern: `src/modules/${type}` })),
        { type: "scripts", pattern: "scripts" },
        // Last on purpose: src/app/** and src/proxy.ts. Element patterns match folders,
        // so the root file proxy.ts is classified through its parent folder.
        { type: "app", pattern: "src" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          // Also check third-party and Node built-in imports, so the policies below can
          // restrict them in dsp and fingerprint. Imports inside one element are not checked.
          checkAllOrigins: true,
          policies: [
            // Third-party packages and Node built-ins are allowed unless restricted below.
            { allow: { to: { module: { origin: ["external", "core"] } } } },
            ...Object.entries(allowedDependencies)
              .filter(([, targets]) => targets.length > 0)
              .map(([from, targets]) => ({
                from: { element: { type: from } },
                allow: { to: { element: targets.map(toSelector) } },
              })),
            {
              from: { element: { type: pureModules } },
              disallow: [
                { to: { module: { origin: "core" } } },
                { to: { module: { origin: "external", source: forbiddenInPureModules } } },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: pureModules.map((type) => `src/modules/${type}/**/*.ts`),
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "window", message: "dsp and fingerprint must stay isomorphic." },
        { name: "document", message: "dsp and fingerprint must stay isomorphic." },
        { name: "self", message: "dsp and fingerprint must stay isomorphic." },
      ],
    },
  },
  // db/testing.ts (PGlite) is an entry point only for test files.
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
    ignores: ["**/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/db/testing", "**/db/testing"],
              message: "db/testing is only for files inside __tests__/.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
]);

export default eslintConfig;
