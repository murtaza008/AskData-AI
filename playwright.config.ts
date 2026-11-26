import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against a production build (`npm run build` first) using the
 * database in `.env` (the live Neon database). Signed-in tests use the shared
 * demo account and only read data; POST /api/chat is always mocked, so no
 * AI calls are made and nothing is written.
 *
 * Locally this uses the installed Google Chrome; in CI, run
 * `npx playwright install chromium` and set CI=1.
 */
const PORT = Number(process.env.E2E_PORT ?? 3200);
const baseURL = `http://localhost:${PORT}`;
const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } };

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  outputDir: "tests/e2e/.results",
  fullyParallel: true,
  // Two workers: every app page waits on a remote database, so more parallel
  // browsers only queue requests and cause timeouts.
  workers: 2,
  // The DB is a remote Neon instance; one retry absorbs network blips.
  retries: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : [["list"]],
  use: {
    baseURL,
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "public", testMatch: /public\.spec\.ts|landing\.spec\.ts/, use: desktop },
    {
      name: "app",
      testMatch: /app\.spec\.ts|data\.spec\.ts|workflow\.spec\.ts|pages\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...desktop, storageState: "tests/e2e/.auth/demo.json" },
    },
    {
      name: "screens",
      testMatch: /screens\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...desktop, storageState: "tests/e2e/.auth/demo.json" },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Auth redirects must point at this server, not a URL from .env.
    env: { AUTH_TRUST_HOST: "true", AUTH_URL: baseURL, NEXTAUTH_URL: baseURL },
  },
});
