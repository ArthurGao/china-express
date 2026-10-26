"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { STAFF_LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { STAFF_LOGIN } from "@/lib/auth/routes";
import { useAssuranceLevel, useSession, useSignOut } from "@/lib/auth/use-session";
import { useLiveUpdates } from "@/lib/live/use-live-updates";
import { activeModule, modulesFor, visiblePages } from "@/lib/staff/modules";
import { useStaffMe } from "@/lib/staff/use-staff-me";

export function StaffNav() {
  const t = useTranslations("staffNav");
  const locale = useLocale() as Locale;
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const signOut = useSignOut(STAFF_LOGIN);
  // Staff links appear only after TOTP: rendered (and prefetched) at aal1 they would cache a redirect to login.
  const verified = useAssuranceLevel(session) === "aal2";
  const me = useStaffMe(verified);
  useLiveUpdates(verified);
  const modules = verified && me.data ? modulesFor(me.data.roles) : [];
  const current = activeModule(pathname);

  function switchLocale() {
    const nextLocale: Locale = locale === "zh-CN" ? "en" : "zh-CN";
    document.cookie = `${STAFF_LOCALE_COOKIE}=${nextLocale}; path=/staff; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center gap-4">
      {modules.length > 0 && (
        <nav className="flex gap-1" aria-label={t("modulesLabel")}>
          {modules.map((m) => (
            <Link key={m.key} href={m.pages[0].href} aria-current={current?.key === m.key ? "page" : undefined}
              className="inline-flex min-h-11 items-center px-2 hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline aria-[current=page]:underline-offset-8">
              {t(`modules.${m.key}`)}
            </Link>
          ))}
        </nav>
      )}
      <div className="ml-auto flex items-center gap-2">
        {me.data && <span className="hidden text-muted-foreground md:inline">{me.data.name}</span>}
        <Button variant="ghost" size="sm" onClick={switchLocale} aria-label={t("language")}>
          {locale === "zh-CN" ? "English" : "中文"}
        </Button>
        {session && <Button variant="ghost" size="sm" onClick={signOut}>{t("signOut")}</Button>}
      </div>
    </div>
  );
}

/** Second row: the pages of the module the current page belongs to, when the user holds its role. */
export function StaffSubNav() {
  const t = useTranslations("staffNav");
  const pathname = usePathname();
  const session = useSession();
  const verified = useAssuranceLevel(session) === "aal2";
  const me = useStaffMe(verified);
  const current = activeModule(pathname);
  if (!current || !me.data?.roles.includes(current.role)) return null;
  const selected = current.pages.filter((p) => pathname === p.href || pathname.startsWith(`${p.href}/`)).at(-1);
  return (
    <nav className="no-print flex gap-1 overflow-x-auto border-b border-rule bg-background px-4" aria-label={t(`modules.${current.key}`)}>
      {visiblePages(current).map((p) => (
        <Link key={p.href} href={p.href} aria-current={selected?.href === p.href ? "page" : undefined}
          className="inline-flex min-h-11 items-center border-b-2 border-transparent px-2 whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground">
          {t(`pages.${p.label}`)}
        </Link>
      ))}
    </nav>
  );
}
