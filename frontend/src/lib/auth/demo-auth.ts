// Demo builds only (NEXT_PUBLIC_DEMO=enabled, ADR 0004). next.config.ts aliases `ce-auth-client` here; every other
// build gets the real Supabase client, and `pnpm check:bundle` fails if the marker below reaches a production bundle.
// A stand-in for the Supabase auth calls the app makes: any email, password and 6-digit code sign in, and nothing
// leaves the browser.
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { hardNavigate } from "@/lib/navigation";
import { safeNext } from "./routes";
import { DEMO_SESSION_COOKIE, readDemoSessionCookie, type DemoSession } from "./demo-session";

const MARKER = "[CE-DEMO]";
const SIX_DIGITS = /^\d{6}$/;
const DEMO_FACTOR = { id: "demo-totp", factor_type: "totp", status: "verified" };
const GOOGLE_DEMO_EMAIL = "google.demo@example.com";

type Listener = (event: string, session: Session | null) => void;

function codeError() {
  return { data: null, error: new Error(`${MARKER} the demo accepts any 6 digits`) };
}

function readCookie(): DemoSession | null {
  return readDemoSessionCookie(document.cookie);
}

function writeCookie(session: DemoSession | null) {
  document.cookie = session
    ? `${DEMO_SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=604800; samesite=lax`
    : `${DEMO_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

function toSession(demo: DemoSession | null): Session | null {
  if (!demo) return null;
  return {
    access_token: "",
    refresh_token: "",
    token_type: "bearer",
    expires_in: 604800,
    user: { id: `demo:${demo.email}`, email: demo.email, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" },
  } as Session;
}

/** `redirectTo` is an /auth/callback URL carrying `next`; the demo skips the OAuth round trip and goes straight there. */
function continueTo(redirectTo: string | undefined) {
  const next = redirectTo ? new URL(redirectTo, window.location.origin).searchParams.get("next") : null;
  hardNavigate(safeNext(next));
}

export function createClient(): SupabaseClient {
  console.info(`${MARKER} demo sign-in: no real accounts, data comes from the API contract examples`);
  const listeners = new Set<Listener>();

  function setSession(event: string, demo: DemoSession | null) {
    writeCookie(demo);
    const session = toSession(demo);
    listeners.forEach((listener) => listener(event, session));
  }

  const auth = {
    async getSession() {
      return { data: { session: toSession(readCookie()) }, error: null };
    },
    onAuthStateChange(listener: Listener) {
      listeners.add(listener);
      return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
    },
    async signOut() {
      setSession("SIGNED_OUT", null);
      return { error: null };
    },
    async signInWithOtp() {
      return { data: {}, error: null };
    },
    async verifyOtp({ email, token }: { email: string; token: string }) {
      if (!SIX_DIGITS.test(token)) return codeError();
      setSession("SIGNED_IN", { email, aal: "aal1" });
      return { data: {}, error: null };
    },
    async signInWithOAuth({ options }: { options?: { redirectTo?: string } }) {
      setSession("SIGNED_IN", { email: GOOGLE_DEMO_EMAIL, aal: "aal1" });
      continueTo(options?.redirectTo);
      return { data: {}, error: null };
    },
    async signInWithPassword({ email }: { email: string }) {
      setSession("SIGNED_IN", { email, aal: "aal1" });
      return { data: {}, error: null };
    },
    async linkIdentity({ options }: { options?: { redirectTo?: string } }) {
      continueTo(options?.redirectTo);
      return { data: {}, error: null };
    },
    async updateUser() {
      return { data: {}, error: null };
    },
    mfa: {
      async listFactors() {
        return { data: { totp: [DEMO_FACTOR], all: [DEMO_FACTOR] }, error: null };
      },
      async challengeAndVerify({ code }: { code: string }) {
        const current = readCookie();
        if (!current || !SIX_DIGITS.test(code)) return codeError();
        setSession("MFA_CHALLENGE_VERIFIED", { ...current, aal: "aal2" });
        return { data: {}, error: null };
      },
      async getAuthenticatorAssuranceLevel() {
        const current = readCookie();
        return { data: { currentLevel: current?.aal ?? null }, error: null };
      },
    },
  };
  // Only the auth calls listed above exist; the app never uses Supabase for data (AGENTS.md).
  return { auth } as unknown as SupabaseClient;
}
