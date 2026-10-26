"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { $api } from "@/lib/api/client";
import { oauthRedirectTo } from "@/lib/auth/routes";
import { getSupabase } from "@/lib/supabase/browser";
import { Addresses } from "./addresses";
import { BillingEntities } from "./billing-entities";
import { NotificationPrefs } from "./notification-prefs";

export function AccountPage() {
  const t = useTranslations("account");
  const queryClient = useQueryClient();
  const params = useSearchParams();
  const me = $api.useQuery("get", "/me", {}, { staleTime: Infinity });
  const link = $api.useMutation("post", "/me/identities/link");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const recorded = useRef(false);

  // Back from Google's consent screen (?linked=google): tell the backend so it records the new identity.
  // Waits for GET /me, which creates the customer on first call and would otherwise overwrite the updated list.
  const meLoaded = !!me.data;
  useEffect(() => {
    // Only the Google flow round-trips through ?linked= (email linking confirms by email).
    if (!meLoaded || recorded.current || params.get("linked") !== "google") return;
    recorded.current = true;
    link.mutate(
      { body: { provider: "google" } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData($api.queryOptions("get", "/me", {}).queryKey, updated);
          setMessage({ kind: "ok", text: t("linked", { provider: t("providers.google") }) });
        },
        onError: () => setMessage({ kind: "error", text: t("linkFailed") }),
      },
    );
  }, [meLoaded, params, link, queryClient, t]);

  if (!me.data) return null;
  const has = (p: string) => me.data.identities.some((i) => i.provider === p);

  async function linkGoogle() {
    const { error } = await getSupabase().auth.linkIdentity({ provider: "google", options: { redirectTo: oauthRedirectTo("/account?linked=google") } });
    if (error) setMessage({ kind: "error", text: t("linkFailed") });
  }

  async function addEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!z.email().safeParse(email).success) return setMessage({ kind: "error", text: t("linkFailed") });
    const { error } = await getSupabase().auth.updateUser({ email });
    setMessage(error ? { kind: "error", text: t("linkFailed") } : { kind: "ok", text: t("emailSent", { email }) });
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <section className="grid gap-3 border border-rule bg-surface p-4">
        <h2 className="text-lg font-semibold">{t("member")}</h2>
        <p className="font-stencil text-5xl" data-testid="account-member-no">{me.data.memberNo}</p>
        <h3 className="font-semibold">{t("markTitle")}</h3>
        <p className="text-sm">{t("markBody")}</p>
      </section>

      <section className="grid gap-3">
        <h2 className="text-lg font-semibold">{t("methods")}</h2>
        <p className="text-sm text-muted-foreground">{t("methodsIntro")}</p>
        <ul className="divide-y divide-rule border-y border-rule" data-testid="identities">
          {me.data.identities.map((i) => (
            <li key={`${i.provider}-${i.label}`} className="flex justify-between gap-4 py-3">
              <span className="font-medium">{t(`providers.${i.provider}`)}</span>
              <span className="truncate text-muted-foreground">{i.label}</span>
            </li>
          ))}
        </ul>
        {!has("google") && (
          <Button type="button" variant="outline" className="h-11 justify-self-start" onClick={linkGoogle}>{t("linkGoogle")}</Button>
        )}
        {!has("email") && (
          <form onSubmit={addEmail} className="grid max-w-sm gap-2" noValidate>
            <Label htmlFor="link-email">{t("emailLabel")}</Label>
            <Input id="link-email" type="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" variant="outline" className="h-11 justify-self-start">{t("addEmail")}</Button>
          </form>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-destructive" : "text-success"}>
            {message.text}
          </p>
        )}
      </section>

      <BillingEntities />
      <Addresses />
      <NotificationPrefs />

      <section className="grid gap-2 border-t border-rule pt-6">
        <h2 className="font-semibold">{t("recoveryTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("recoveryBody")}</p>
      </section>
    </div>
  );
}
