"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { MemberNumber } from "@/components/member-number";
import { Button } from "@/components/ui/button";
import { useSession, useSignOut } from "@/lib/auth/use-session";

export function CustomerNav() {
  const t = useTranslations("customerNav");
  const session = useSession();
  const signOut = useSignOut("/");

  if (session === undefined) return null;
  if (session === null) {
    return (
      <Button asChild variant="outline" className="h-10">
        <Link href="/login">{t("signIn")}</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <MemberNumber />
      <nav className="hidden items-center gap-4 text-sm sm:flex">
        <Link href="/quote" className="hover:underline">{t("quote")}</Link>
        <Link href="/account" className="hover:underline">{t("account")}</Link>
      </nav>
      <Button variant="ghost" className="h-10 px-2 text-sm" onClick={signOut}>{t("signOut")}</Button>
    </div>
  );
}
