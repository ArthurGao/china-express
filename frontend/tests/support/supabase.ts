// Test-only helpers against the LOCAL Supabase stack (never a hosted project). Keys are read from
// `supabase status` at run time and never written to disk.
import { execFileSync } from "node:child_process";

type Status = { API_URL: string; SERVICE_ROLE_KEY: string; MAILPIT_URL?: string; INBUCKET_URL?: string };

let cached: Status | undefined;

export function localSupabase(): Status {
  if (cached) return cached;
  const out = execFileSync("pnpm", ["exec", "supabase", "status", "--workdir", "..", "-o", "json"], { encoding: "utf8" });
  const status = JSON.parse(out.slice(out.indexOf("{"))) as Status;
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(status.API_URL)) {
    throw new Error(`Refusing to run e2e auth against a non-local Supabase: ${status.API_URL}`);
  }
  cached = status;
  return status;
}

export const STAFF = { email: "staff-e2e@chinaexpress.test", password: "e2e-Staff-Passw0rd" };

/** Creates (or recreates) the e2e staff user with no MFA factor, so every run enrols TOTP from scratch. */
export async function resetStaffUser(): Promise<void> {
  const { API_URL, SERVICE_ROLE_KEY } = localSupabase();
  const headers = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
  const list = await fetch(`${API_URL}/auth/v1/admin/users?per_page=1000`, { headers }).then((r) => r.json());
  for (const u of (list.users ?? []) as { id: string; email: string }[]) {
    if (u.email === STAFF.email) await fetch(`${API_URL}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers });
  }
  const res = await fetch(`${API_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email: STAFF.email, password: STAFF.password, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`Could not create e2e staff user: ${res.status} ${await res.text()}`);
}

/** Waits for the sign-in email to `to` and returns its 6-digit code (Mailpit captures all local mail). */
export async function readOtp(to: string, timeoutMs = 15_000): Promise<string> {
  const { MAILPIT_URL, INBUCKET_URL } = localSupabase();
  const base = MAILPIT_URL ?? INBUCKET_URL;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const search = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=1`).then((r) => r.json());
    const id = search.messages?.[0]?.ID as string | undefined;
    if (id) {
      const msg = await fetch(`${base}/api/v1/message/${id}`).then((r) => r.json());
      const code = /\b(\d{6})\b/.exec(msg.Text ?? "")?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No sign-in code arrived for ${to}`);
}
