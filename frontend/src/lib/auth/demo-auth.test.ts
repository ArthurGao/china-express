import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "./demo-auth";
import { DEMO_SESSION_COOKIE, readDemoSessionCookie } from "./demo-session";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/navigation", () => ({ hardNavigate: navigate }));

const cookieSession = () => readDemoSessionCookie(document.cookie);

describe("demo auth client", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    navigate.mockReset();
  });
  afterEach(() => {
    document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0`;
    vi.restoreAllMocks();
  });

  it("signs a customer in with any 6-digit code and refuses anything else", async () => {
    const { auth } = createClient();
    expect((await auth.verifyOtp({ email: "amy@example.co.nz", token: "12345", type: "email" })).error).not.toBeNull();
    expect(cookieSession()).toBeNull();

    expect((await auth.verifyOtp({ email: "amy@example.co.nz", token: "000000", type: "email" })).error).toBeNull();
    expect(cookieSession()).toEqual({ email: "amy@example.co.nz", aal: "aal1" });
    expect((await auth.getSession()).data.session?.user.email).toBe("amy@example.co.nz");
  });

  it("raises staff to aal2 only after a 6-digit TOTP code", async () => {
    const { auth } = createClient();
    await auth.signInWithPassword({ email: "ops@example.co.nz", password: "anything" });
    expect((await auth.mfa.getAuthenticatorAssuranceLevel()).data?.currentLevel).toBe("aal1");
    const { data } = await auth.mfa.listFactors();
    expect(data?.totp.map((f) => f.status)).toEqual(["verified"]);

    expect((await auth.mfa.challengeAndVerify({ factorId: "demo-totp", code: "abc123" })).error).not.toBeNull();
    expect(cookieSession()?.aal).toBe("aal1");
    expect((await auth.mfa.challengeAndVerify({ factorId: "demo-totp", code: "123456" })).error).toBeNull();
    expect(cookieSession()).toEqual({ email: "ops@example.co.nz", aal: "aal2" });
  });

  it("refuses TOTP without a signed-in user", async () => {
    const { auth } = createClient();
    expect((await auth.mfa.challengeAndVerify({ factorId: "demo-totp", code: "123456" })).error).not.toBeNull();
    expect(cookieSession()).toBeNull();
  });

  it("tells listeners about sign-in and sign-out, and sign-out clears the session", async () => {
    const { auth } = createClient();
    const events: [string, string | undefined][] = [];
    auth.onAuthStateChange((event, session) => { events.push([event, session?.user.email]); });
    await auth.verifyOtp({ email: "amy@example.co.nz", token: "123456", type: "email" });
    await auth.signOut();
    expect(events).toEqual([["SIGNED_IN", "amy@example.co.nz"], ["SIGNED_OUT", undefined]]);
    expect(cookieSession()).toBeNull();
    expect((await auth.getSession()).data.session).toBeNull();
  });

  it("skips the Google round trip and continues to the callback's safe `next`", async () => {
    const { auth } = createClient();
    await auth.signInWithOAuth({ provider: "google", options: { redirectTo: "http://localhost:3000/auth/callback?next=%2Fquote%3Fsrc%3Dfb" } });
    expect(cookieSession()?.aal).toBe("aal1");
    expect(navigate).toHaveBeenCalledWith("/quote?src=fb");

    await auth.linkIdentity({ provider: "google", options: { redirectTo: "http://localhost:3000/auth/callback?next=%2F%2Fevil.example" } });
    expect(navigate).toHaveBeenLastCalledWith("/quote");
  });
});
