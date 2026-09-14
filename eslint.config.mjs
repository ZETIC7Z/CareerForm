import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored third-party build artifact served as a static asset:
    "public/pdf.worker.min.mjs",
    // Scratch downloads, Playwright output and scraped references:
    "tmp/**",
    "test-results/**",
    "playwright-report/**",
    "tests/**",
  ]),
]);

export default eslintConfig;
