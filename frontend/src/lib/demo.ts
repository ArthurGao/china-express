/** Demo build (NEXT_PUBLIC_DEMO=enabled, ADR 0004): in-browser sign-in and a banner; `build:demo` also turns on MSW. */
export const DEMO = process.env.NEXT_PUBLIC_DEMO === "enabled";
