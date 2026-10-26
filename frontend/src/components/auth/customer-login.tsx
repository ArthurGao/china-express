"use client";

import { ErrorText } from "@/components/feedback";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { oauthRedirectTo, safeNext } from "@/lib/auth/routes";
import { hardNavigate } from "@/lib/navigation";
import { DEMO } from "@/lib/demo";
import { touchLead } from "@/lib/leads";
import { getSupabase } from "@/lib/supabase/browser";

const emailSchema = z.object({ email: z.email() });
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

export function CustomerLogin() {
  const t = useTranslations("auth");
  const tDemo = useTranslations("demo");
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailForm = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });
  const codeForm = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema) });

  async function sendCode({ email }: z.infer<typeof emailSchema>) {
    setError(null);
    const { error } = await getSupabase().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) return setError(t("errors.send"));
    setEmail(email);
  }

  async function verifyCode({ code }: z.infer<typeof codeSchema>) {
    if (!email) return;
    setError(null);
    const { error } = await getSupabase().auth.verifyOtp({ email, token: code, type: "email" });
    if (error) return setError(t("errors.code"));
    void touchLead("SIGNED_UP");
    hardNavigate(next);
  }

  async function google() {
    setError(null);
    const { error } = await getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: oauthRedirectTo(next) } });
    if (error) setError(t("errors.google"));
  }

  return (
    <div className="grid gap-8">
      {email === null ? (
        <form onSubmit={emailForm.handleSubmit(sendCode)} className="grid gap-3" noValidate>
          <Label htmlFor="email">{t("email.label")}</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" className="h-12"
            aria-invalid={!!emailForm.formState.errors.email} {...emailForm.register("email")} />
          {emailForm.formState.errors.email && <p className="text-sm text-destructive">{t("errors.email")}</p>}
          <Button type="submit" size="lg" className="h-12" disabled={emailForm.formState.isSubmitting}>
            {t("email.send")}
          </Button>
        </form>
      ) : (
        <form onSubmit={codeForm.handleSubmit(verifyCode)} className="grid gap-3" noValidate>
          {/* The demo build (ADR 0004) sends no email; say so instead of claiming a code was sent. */}
          <p className="text-sm text-muted-foreground">{DEMO ? tDemo("emailCode") : t("code.sentTo", { email })}</p>
          <Label htmlFor="code">{t("code.label")}</Label>
          <Input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
            className="h-12 font-mono text-xl tracking-[0.4em]" aria-invalid={!!codeForm.formState.errors.code}
            {...codeForm.register("code")} />
          {codeForm.formState.errors.code && <p className="text-sm text-destructive">{t("errors.codeFormat")}</p>}
          <Button type="submit" size="lg" className="h-12" disabled={codeForm.formState.isSubmitting}>
            {t("code.verify")}
          </Button>
          <Button type="button" variant="link" onClick={() => setEmail(null)}>{t("code.changeEmail")}</Button>
        </form>
      )}

      <div className="grid gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-px flex-1 bg-rule" />{t("or")}<span className="h-px flex-1 bg-rule" />
        </div>
        <Button type="button" variant="outline" size="lg" className="h-12" onClick={google}>{t("google")}</Button>
      </div>

      <ErrorText className="text-sm">{error}</ErrorText>
    </div>
  );
}
