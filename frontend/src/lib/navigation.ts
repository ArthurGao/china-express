/**
 * Full page navigation. Used after sign-in / TOTP verification so the proxy sees the new session cookie: the client
 * router may hold a prefetched redirect taken while signed out (or at aal1).
 */
export function hardNavigate(url: string): void {
  window.location.assign(url);
}
