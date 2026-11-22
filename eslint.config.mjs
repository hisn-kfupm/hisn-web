import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import hisn from "./tools/eslint-rules/index.js";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Team conventions (dev-1 D1-3). Tests, scripts and database code may use literals freely.
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    ignores: ["tests/**", "scripts/**", "supabase/**"],
    plugins: { hisn },
    rules: {
      "hisn/no-literal-text": "error",
      "hisn/no-supabase-name": "error",
      "hisn/talent-import": "error",
      "hisn/no-physical-classes": "error",
    },
  },
  // The plugin is CommonJS so ESLint and Vitest can load it without a build step.
  {
    files: ["tools/eslint-rules/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
