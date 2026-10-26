"use client";

import type { Session } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/browser";

/** undefined while loading, null when signed out. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

/** "aal2" once TOTP is verified in this session; null when signed out or still loading. */
export function useAssuranceLevel(session: Session | null | undefined): string | null {
  const [level, setLevel] = useState<string | null>(null);
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getSupabase().auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      if (!cancelled) setLevel(data?.currentLevel ?? null);
    });
    return () => { cancelled = true; };
  }, [session]);
  return session ? level : null;
}

/** Signs out, drops all cached API data and leaves for `redirectTo`. */
export function useSignOut(redirectTo: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return async () => {
    await getSupabase().auth.signOut();
    queryClient.clear();
    router.replace(redirectTo);
    router.refresh();
  };
}
