"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MemberNumber } from "@/components/member-number";
import { Button } from "@/components/ui/button";
import { $api } from "@/lib/api/client";
import { useSession, useSignOut } from "@/lib/auth/use-session";
import { useLiveUpdates } from "@/lib/live/use-live-updates";

export function CustomerNav() {
  const t = useTranslations("customerNav");
  const session = useSession();
  const signOut = useSignOut("/");

  if (session === undefined) return null;
  if (session === null) {
    return (
      <Button asChild variant="outline" className="h-11">
        <Link href="/login">{t("signIn")}</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <MemberNumber />
      <Button variant="ghost" className="h-11 px-2 text-sm" onClick={signOut}>{t("signOut")}</Button>
    </div>
  );
}

const TABS = [
  { href: "/quote", key: "quote" },
  { href: "/shipments", key: "shipments" },
  { href: "/notifications", key: "notifications" },
  { href: "/account", key: "account" },
] as const;

/** Signed-in customers' sections, as a scrollable tab row so it works the same on phones. */
export function CustomerTabs() {
  const t = useTranslations("customerNav");
  const session = useSession();
  const pathname = usePathname();
  const notifications = $api.useQuery("get", "/me/notifications", {}, { enabled: !!session });
  useLiveUpdates(!!session);
  if (!session) return null;
  const unread = notifications.data?.unreadCount ?? 0;
  return (
    <nav aria-label={t("sections")} className="no-print border-b border-rule bg-surface">
      <div className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-2">
        {TABS.map(({ href, key }) => {
          const current = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} aria-current={current ? "page" : undefined}
              className="flex min-h-11 items-center gap-1.5 border-b-2 border-transparent px-3 text-sm whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground">
              {t(key)}
              {key === "notifications" && unread > 0 && (
                <span className="tabular rounded-sm bg-foreground px-1.5 text-xs text-background" aria-label={t("unread", { count: unread })}>
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
