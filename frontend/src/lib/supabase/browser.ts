"use client";

// AUTH ONLY: sign-in, sign-out, session and access token. Business data always goes through the backend API;
// never call `.from()` on this client.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let client: SupabaseClient | undefined;
// Latest access token, kept current by auth events so API calls do not re-read the session cookie each time.
let accessToken: string | null | undefined;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
