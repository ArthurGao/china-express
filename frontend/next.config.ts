import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// cacheComponents stays off: nearly every page is per-user and fetches through the backend API on the client,
// so a prerendered shell buys little, and request-scoped reads (session cookie, locale header) would each need a
// Suspense boundary. Revisit when public, cacheable pages appear.
const mocking = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

const nextConfig: NextConfig = {
  // e2e builds (with API mocking) go to their own directory so they never mix with the production build.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  turbopack: {
    // Dev/test API mocks (MSW) exist only when explicitly enabled; otherwise the import resolves to a stub.
    resolveAlias: {
      // The worker only exists in the browser; the SSR pass of the client component always gets the stub.
      "ce-mock-worker": mocking
        ? { browser: "./src/mocks/browser.ts", default: "./src/mocks/disabled.ts" }
        : "./src/mocks/disabled.ts",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
