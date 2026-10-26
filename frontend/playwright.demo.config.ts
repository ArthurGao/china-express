import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// The demo build (ADR 0004) on its own: contract examples and in-browser sign-in, no backend and no Supabase.
// Same devices and settings as playwright.config.ts; builds into .next-demo so it never touches .next.
const PORT = 3602;

export default defineConfig({
  ...base,
  testMatch: /demo(-modules)?\.spec\.ts/,
  globalSetup: undefined, // no Supabase to prepare
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/demo" }]],
  use: { ...base.use, baseURL: `http://localhost:${PORT}` },
  projects: base.projects?.map((project) => ({ ...project, testMatch: undefined })), // run demo.spec on every device
  webServer: {
    command: "pnpm build:demo && pnpm start:demo",
    url: `http://localhost:${PORT}/login`,
    env: { NEXT_DIST_DIR: ".next-demo" },
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
