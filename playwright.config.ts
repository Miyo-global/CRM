import { defineConfig, devices } from "@playwright/test";

/**
 * MIYO-0686: the ATS golden path runs against a running app with a seeded
 * database. It is not part of `pnpm test`; run it with `pnpm test:e2e`
 * against a local or preview deployment.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
