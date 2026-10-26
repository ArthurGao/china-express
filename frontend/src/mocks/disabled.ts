// Production stand-in for the MSW worker. next.config.ts aliases `ce-mock-worker` here unless
// NEXT_PUBLIC_API_MOCKING=enabled, so MSW never enters a production bundle.
export const worker = {
  start(): Promise<void> {
    throw new Error("API mocking is disabled in this build");
  },
};
