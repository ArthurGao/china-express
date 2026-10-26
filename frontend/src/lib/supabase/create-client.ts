// The real Supabase browser client. next.config.ts aliases `ce-auth-client` here in every build except the demo
// (ADR 0004), which gets src/lib/auth/demo-auth.ts instead.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export function createClient(): SupabaseClient {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
