"use client";

import { safeHref } from "@/lib/safe-href";
import { ErrorText } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { When } from "@/components/when";
import { $api } from "@/lib/api/client";
import { useLocalized } from "@/lib/i18n-text";

export function NotificationList() {
  const t = useTranslations("notifications");
  const localized = useLocalized();
  const queryClient = useQueryClient();
  const list = $api.useQuery("get", "/me/notifications");
  const markRead = $api.useMutation("post", "/me/notifications/read");

  if (list.isError) return <ErrorText>{t("errors.load")}</ErrorText>;
  if (!list.data) return null;
  const unread = list.data.items.filter((n) => !n.readAt).map((n) => n.id);

  function readAll() {
    markRead.mutate({ body: { ids: unread } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: $api.queryOptions("get", "/me/notifications").queryKey }),
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("unread", { count: list.data.unreadCount })}</p>
        {unread.length > 0 && <Button variant="outline" size="sm" onClick={readAll} disabled={markRead.isPending}>{t("readAll")}</Button>}
      </div>
      {list.data.items.length === 0 ? <p>{t("empty")}</p> : (
        <ul className="divide-y divide-rule border-y border-rule" data-testid="notification-list">
          {list.data.items.map((n) => (
            <li key={n.id} className="grid gap-1 py-3" data-unread={!n.readAt || undefined}>
              <span className="text-xs text-muted-foreground"><When iso={n.createdAt} /></span>
              <span className={n.readAt ? "" : "font-semibold"}>
                {!n.readAt && <span className="mr-2 inline-block size-2 bg-foreground" aria-label={t("new")} />}
                {localized(n.title)}
              </span>
              <p className="text-sm text-muted-foreground">{localized(n.body)}</p>
              {safeHref(n.link) && <Link href={safeHref(n.link)!} className="inline-flex min-h-11 items-center justify-self-start text-sm font-medium underline">{t("open")}</Link>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
