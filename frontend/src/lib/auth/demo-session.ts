// Demo builds keep the signed-in state in a plain cookie so proxy.ts can apply the same route rules as with Supabase.
// It grants nothing: demo builds have no backend and no real accounts.

export const DEMO_SESSION_COOKIE = "ce-demo-session";

export type DemoSession = { email: string; aal: "aal1" | "aal2" };

/** The demo session from a `document.cookie` string. */
export function readDemoSessionCookie(cookies: string): DemoSession | null {
  const entry = cookies.split("; ").find((c) => c.startsWith(`${DEMO_SESSION_COOKIE}=`));
  return parseDemoSession(entry ? decodeURIComponent(entry.slice(DEMO_SESSION_COOKIE.length + 1)) : undefined);
}

/** The cookie value (already URI-decoded) as a session, or null when absent or malformed. */
export function parseDemoSession(raw: string | undefined): DemoSession | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { email, aal } = value as Record<string, unknown>;
    if (typeof email !== "string" || email === "" || (aal !== "aal1" && aal !== "aal2")) return null;
    return { email, aal };
  } catch {
    return null;
  }
}
