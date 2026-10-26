"use client";

// AUTH ONLY: sign-in, sign-out, session and access token. Business data always goes through the backend API;
// never call `.from()` on this client.
import type { SupabaseClient } from "@supabase/supabase-js";
// The real client, or the in-browser demo stand-in in demo builds (ADR 0004); see next.config.ts.
import { createClient } from "ce-auth-client";

let client: SupabaseClient | undefined;
// Latest access token, kept current by auth events so API calls do not re-read the session cookie each time.
let accessToken: string | null | undefined;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient();
    client.auth.onAuthStateChange((_event, session) => {
      accessToken = session?.access_token ?? null;
    });
  }
  return client;
}

export async function getAccessToken(): Promise<string | null> {
  if (accessToken !== undefined) return accessToken;
  const { data } = await getSupabase().auth.getSession();
  accessToken = data.session?.access_token ?? null;
  return accessToken;
}
