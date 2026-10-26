import { defineConfig, devices } from "@playwright/test";

// e2e runs a production build with API mocking (contract examples) against the local Supabase auth stack
// (`pnpm supabase:start`). It builds into .next-e2e so it never touches the production .next directory.
const PORT = 3601;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/global-setup.ts",
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 15"] }, testMatch: /customer\.spec\.ts|in-app-browser\.spec\.ts/ },
    { name: "pixel", use: { ...devices["Pixel 7"] }, testMatch: /customer\.spec\.ts|in-app-browser\.spec\.ts/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /staff\.spec\.ts/ },
  ],
  webServer: {
    command:
      "pnpm exec msw init public --save=false && NEXT_DIST_DIR=.next-e2e pnpm exec next build && NEXT_DIST_DIR=.next-e2e pnpm exec next start --port " +
      PORT,
    url: `${BASE_URL}/login`,
    env: { NEXT_PUBLIC_API_MOCKING: "enabled" },
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
