"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

type Prefs = components["schemas"]["NotificationPrefsUpdate"];
const CHANNELS = ["email", "whatsapp", "marketing"] as const;

/** Transactional channels and a separate marketing consent (design 08: consent time is recorded by the backend). */
export function NotificationPrefs() {
  const t = useTranslations("account.prefs");
  const queryClient = useQueryClient();
  const prefs = $api.useQuery("get", "/me/notification-prefs");
  const save = $api.useMutation("put", "/me/notification-prefs");
  const [draft, setDraft] = useState<Prefs | null>(null);
  const [saved, setSaved] = useState(false);
  const current = draft ?? prefs.data;
  if (!current) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    save.mutate({ body: draft }, {
      onSuccess: (updated) => {
        queryClient.setQueryData($api.queryOptions("get", "/me/notification-prefs").queryKey, updated);
        setDraft(null);
        setSaved(true);
      },
    });
  }

  return (
    <section className="grid gap-3" aria-labelledby="prefs-title">
      <h2 id="prefs-title" className="text-lg font-semibold">{t("title")}</h2>
      <form onSubmit={submit} className="grid gap-2">
        {CHANNELS.map((key) => (
          <label key={key} className="flex min-h-11 items-start gap-3">
            <input type="checkbox" className="mt-1 size-5 shrink-0" checked={current[key]}
              onChange={(e) => { setSaved(false); setDraft({ email: current.email, whatsapp: current.whatsapp, marketing: current.marketing, [key]: e.target.checked }); }} />
            <span className="grid">
              <span className="font-medium">{t(`${key}.label`)}</span>
              <span className="text-sm text-muted-foreground">{t(`${key}.body`)}</span>
            </span>
          </label>
        ))}
        <Button type="submit" variant="outline" className="h-11 justify-self-start" disabled={!draft || save.isPending}>{t("save")}</Button>
        {saved && <p role="status" className="text-sm text-success">{t("saved")}</p>}
      </form>
    </section>
  );
}
