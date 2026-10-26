"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { STAFF_LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { STAFF_LOGIN } from "@/lib/auth/routes";
import { useAssuranceLevel, useSession, useSignOut } from "@/lib/auth/use-session";

export function StaffNav() {
  const t = useTranslations("staffNav");
  const locale = useLocale() as Locale;
  const session = useSession();
  const router = useRouter();
  const signOut = useSignOut(STAFF_LOGIN);
  // Staff links appear only after TOTP: rendered (and prefetched) at aal1 they would cache a redirect to login.
  const verified = useAssuranceLevel(session) === "aal2";

  function switchLocale() {
    const nextLocale: Locale = locale === "zh-CN" ? "en" : "zh-CN";
    document.cookie = `${STAFF_LOCALE_COOKIE}=${nextLocale}; path=/staff; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center gap-4">
      {verified && (
        <nav className="flex gap-4">
          <Link href="/staff/admin/rates" className="hover:underline">{t("rates")}</Link>
        </nav>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={switchLocale} aria-label={t("language")}>
          {locale === "zh-CN" ? "English" : "中文"}
        </Button>
        {session && <Button variant="ghost" size="sm" onClick={signOut}>{t("signOut")}</Button>}
      </div>
    </div>
  );
}
