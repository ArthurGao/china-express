"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { setAccessTokenProvider } from "@/lib/api/client";
import { getAccessToken } from "@/lib/supabase/browser";

// Every backend call carries the current Supabase access token as a Bearer token.
setAccessTokenProvider(getAccessToken);

const MOCKING = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

// Started once per page load: React StrictMode runs effects twice in dev, and MSW refuses a second start.
let mockingStarted: Promise<void> | undefined;

function startMocking(): Promise<void> {
  // `ce-mock-worker` resolves to a stub unless NEXT_PUBLIC_API_MOCKING=enabled (next.config.ts), so production
  // bundles never contain MSW (asserted by `pnpm check:bundle`).
  mockingStarted ??= import("ce-mock-worker").then(({ worker }) =>
    worker.start({ onUnhandledFrame: "bypass", quiet: true }).then(() => undefined),
  );
  return mockingStarted;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }),
  );
  // When mocking, hold rendering until the service worker is ready so the first request is intercepted.
  const [ready, setReady] = useState(!MOCKING);

  useEffect(() => {
    if (MOCKING) startMocking().then(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
