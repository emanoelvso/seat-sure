// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, globalIgnores } from "eslint/config";
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
  // No cross-feature imports
  ...features.map((feature) => ({
    target: `./src/features/${feature}`,
    from: "./src/features",
    except: [`./${feature}`],
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
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  ...storybook.configs["flat/recommended"]
]);

export default eslintConfig;
