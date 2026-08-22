import { defineConfig } from "vitest/config";

/**
 * The project test suite is intentionally rooted at tests/. Audit exports may
 * include read-only copies of selected test files, but those copies are
 * deliverable evidence rather than runnable project tests and do not carry the
 * complete import graph. Keeping discovery explicit prevents an export folder
 * from altering regression results while preserving every real test file.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["exports/**", "node_modules/**", "dist/**"],
  },
});
