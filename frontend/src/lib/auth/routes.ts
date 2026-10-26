// Route access rules applied in proxy.ts. These are optimistic checks for UX only; the backend authorises every
// request (JwtGuard, RolesGuard, aal2 on staff routes).

export const CUSTOMER_LOGIN = "/login";
export const STAFF_LOGIN = "/staff/login";
export const STAFF_HOME = "/staff";
export const AUTH_CALLBACK = "/auth/callback";

/** Where Supabase sends the browser back after OAuth (sign-in or linking), continuing to `next`. */
export function oauthRedirectTo(next: string): string {
  return `${window.location.origin}${AUTH_CALLBACK}?next=${encodeURIComponent(next)}`;
}

// Login before quoting: DECISION(A4) ★, as the handover says (guests only see the login page).
const CUSTOMER_PROTECTED = ["/quote", "/pre-notice", "/account", "/shipments", "/notifications", "/payments"];

function under(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Paths whose access depends on the session; everything else renders without touching Supabase in the proxy. */
export function needsSession(pathname: string): boolean {
  return under(pathname, "/staff") || CUSTOMER_PROTECTED.some((p) => under(pathname, p));
}

export type Claims = { aal?: string } | null;

export type Access = { allow: true } | { allow: false; redirectTo: string };

/** `search` (with leading "?") is kept in `next` so sales-link parameters survive the login redirect. */
export function checkAccess(pathname: string, claims: Claims, search = ""): Access {
  if (under(pathname, "/staff")) {
    if (under(pathname, STAFF_LOGIN)) return { allow: true };
    // Staff must have completed TOTP (aal2) before any staff page renders.
    if (!claims || claims.aal !== "aal2") return { allow: false, redirectTo: STAFF_LOGIN };
    return { allow: true };
  }
  if (CUSTOMER_PROTECTED.some((p) => under(pathname, p)) && !claims) {
    return { allow: false, redirectTo: `${CUSTOMER_LOGIN}?next=${encodeURIComponent(pathname + search)}` };
  }
  return { allow: true };
}

const PROBE_ORIGIN = "http://same-site.invalid";

/**
 * Only same-site relative paths are accepted as a post-login destination (no open redirects). Control characters and
 * backslashes are rejected because browsers strip or normalise them (`/\t/evil` becomes `//evil`), and the parsed URL
 * must stay on the same origin.
 */
export function safeNext(next: string | null | undefined, fallback = "/quote"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\u0000-\u001F\u007F\\]/.test(next)) return fallback;
  try {
    const url = new URL(next, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
