// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, globalIgnores } from "eslint/config";
import checkFile from "eslint-plugin-check-file";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Bulletproof React boundaries, see docs/architecture-guidelines.md
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const featuresDir = path.join(rootDir, "src/features");
const features = fs.existsSync(featuresDir)
  ? fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  : [];

const boundaryZones = [
  // No cross-feature imports, except every feature may reuse `auth`'s
  // session primitives (session cookies, refresh, withAccessToken): every
  // protected feature needs them, same as the API's public-API-provider
  // pattern for cross-module reads (buy-ticket-checkout design.md, Code
  // Reuse Analysis). See ADR-008.
  ...features.map((feature) => ({
    target: `./src/features/${feature}`,
    from: "./src/features",
    except: feature === "auth" ? [`./${feature}`] : [`./${feature}`, "./auth"],
  })),
  // Unidirectional: shared -> features -> app
  { target: "./src/features", from: "./src/app" },
  {
    target: [
      "./src/components",
      "./src/config",
      "./src/hooks",
      "./src/lib",
      "./src/testing",
      "./src/types",
      "./src/utils",
    ],
    from: ["./src/features", "./src/app"],
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "import/no-restricted-paths": [
        "error",
        { basePath: rootDir, zones: boundaryZones },
      ],
    },
  },
  // Bulletproof React naming: kebab-case files and folders (Next.js route
  // segments under src/app), named exports.
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "check-file": checkFile },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        { "src/**/*.{ts,tsx}": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
      "check-file/folder-naming-convention": [
        "error",
        {
          "src/app/**/": "NEXT_JS_APP_ROUTER_CASE",
          "src/!(app)/**/": "KEBAB_CASE",
        },
        { ignoreWords: ["__tests__", "__generated__"] },
      ],
      "import/no-default-export": "error",
    },
  },
  // Next.js special files and story `meta` must export by default.
  {
    files: [
      "src/app/**/{page,layout,error,not-found,loading,global-error}.tsx",
      "**/*.stories.tsx",
    ],
    rules: {
      "import/no-default-export": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // GraphQL types written by `pnpm codegen`
    "src/types/__generated__/**",
  ]),
  ...storybook.configs["flat/recommended"]
]);

export default eslintConfig;
