"use client";

import { ErrorText } from "@/components/feedback";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STAFF_HOME } from "@/lib/auth/routes";
import { DEMO } from "@/lib/demo";
import { hardNavigate } from "@/lib/navigation";
import { getSupabase } from "@/lib/supabase/browser";

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(1) });
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

type Step =
  | { kind: "credentials" }
  | { kind: "enroll"; factorId: string; qrCode: string; secret: string }
  | { kind: "verify"; factorId: string };

// Staff sign in with email + password, then TOTP is mandatory (enrolled on first sign-in). Staff routes and the
// backend both require aal2.
export function StaffLogin() {
  const t = useTranslations("staffAuth");
  const tDemo = useTranslations("demo");
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [error, setError] = useState<string | null>(null);

  const credForm = useForm<z.infer<typeof credentialsSchema>>({ resolver: zodResolver(credentialsSchema) });
  const codeForm = useForm<z.infer<typeof codeSchema>>({ resolver: zodResolver(codeSchema) });

  async function signIn(values: z.infer<typeof credentialsSchema>) {
    setError(null);
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) return setError(t("errors.credentials"));

    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) return setError(t("errors.generic"));
    const verified = factors.totp.find((f) => f.status === "verified");
    if (verified) return setStep({ kind: "verify", factorId: verified.id });

    // Drop half-finished enrolments so a fresh QR code is shown.
    for (const f of factors.all.filter((f) => f.factor_type === "totp" && f.status === "unverified")) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `China Express ${new Date().toISOString().slice(0, 10)}`,
    });
    if (enrollError) return setError(t("errors.generic"));
    setStep({ kind: "enroll", factorId: enrolled.id, qrCode: enrolled.totp.qr_code, secret: enrolled.totp.secret });
  }

  async function verify({ code }: z.infer<typeof codeSchema>) {
    if (step.kind === "credentials") return;
    setError(null);
    const { error } = await getSupabase().auth.mfa.challengeAndVerify({ factorId: step.factorId, code });
    if (error) return setError(t("errors.code"));
    hardNavigate(STAFF_HOME);
  }

  if (step.kind === "credentials") {
    return (
      <form onSubmit={credForm.handleSubmit(signIn)} className="grid gap-3" noValidate>
        {DEMO && <p className="text-muted-foreground">{tDemo("staffSignIn")}</p>}
        <Label htmlFor="staff-email">{t("email")}</Label>
        <Input id="staff-email" type="email" autoComplete="username" {...credForm.register("email")} />
        <Label htmlFor="staff-password">{t("password")}</Label>
        <Input id="staff-password" type="password" autoComplete="current-password" {...credForm.register("password")} />
        <Button type="submit" className="mt-2 h-10" disabled={credForm.formState.isSubmitting}>{t("signIn")}</Button>
        <ErrorText>{error}</ErrorText>
      </form>
    );
  }

  return (
    <form onSubmit={codeForm.handleSubmit(verify)} className="grid gap-3" noValidate>
      {step.kind === "enroll" && (
        <div className="grid gap-3">
          <p>{t("enroll.intro")}</p>
          {/* Supabase returns the QR code as an SVG data URL; next/image does not handle data URLs. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.qrCode} alt={t("enroll.qrAlt")} className="h-44 w-44 border border-rule bg-white p-2" />
          <p className="text-muted-foreground">
            {t("enroll.manual")} <code className="font-mono break-all" data-testid="totp-secret">{step.secret}</code>
          </p>
        </div>
      )}
      {DEMO && <p className="text-muted-foreground">{tDemo("totp")}</p>}
      <Label htmlFor="totp">{t("code")}</Label>
      <Input id="totp" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        className="font-mono tracking-[0.3em]" {...codeForm.register("code")} />
      {codeForm.formState.errors.code && <p className="text-destructive">{t("errors.codeFormat")}</p>}
      <Button type="submit" className="mt-2 h-10" disabled={codeForm.formState.isSubmitting}>{t("verify")}</Button>
      <ErrorText>{error}</ErrorText>
    </form>
  );
}
