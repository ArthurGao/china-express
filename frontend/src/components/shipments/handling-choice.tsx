"use client";

import { ErrorText } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PriceLines } from "@/components/money";
import { Button } from "@/components/ui/button";
import { $api, errorStatus, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { useLocalized } from "@/lib/i18n-text";
import { ParcelList } from "./parcel-list";

type HandlingMode = components["schemas"]["HandlingMode"];

/**
 * Once parcels are at the warehouse the customer chooses how they travel. Which options are allowed, and their fees,
 * come from the backend (A2 eligibility, D1/D2, C4 fees); the page only offers what the API allows.
 */
export function HandlingChoice({ preNoticeId }: { preNoticeId: string }) {
  const t = useTranslations("shipments.handling");
  const localized = useLocalized();
  const queryClient = useQueryClient();
  const options = { params: { path: { preNoticeId } } };
  const handling = $api.useQuery("get", "/pre-notices/{preNoticeId}/handling", options);
  const choose = $api.useMutation("post", "/pre-notices/{preNoticeId}/handling-choice");
  const [mode, setMode] = useState<HandlingMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const h = handling.data;
  if (!h || h.parcels.length === 0) return null;

  function submit() {
    if (!mode) return setError(t("pick"));
    setError(null);
    choose.mutate(
      { params: { path: { preNoticeId }, header: idem() }, body: { mode, expectedVersion: h!.version } },
      {
        onSuccess: (updated) => queryClient.setQueryData($api.queryOptions("get", "/pre-notices/{preNoticeId}/handling", options).queryKey, updated),
        onError: (e) => setError(t(errorStatus(e) === 409 ? "changed" : "failed")),
      },
    );
  }

  return (
    <section className="grid gap-4" aria-labelledby="handling-title">
      <h2 id="handling-title" className="text-lg font-semibold">{t("title", { count: h.parcels.length })}</h2>
      <ParcelList parcels={h.parcels} />
      {h.choice ? (
        <p role="status" className="border border-rule bg-surface p-4 font-medium" data-testid="handling-chosen">
          {t("chosen", { mode: t(`modes.${h.choice}.name`) })}
        </p>
      ) : (
        <fieldset className="grid gap-3">
          <legend className="mb-2 font-medium">{t("question")}</legend>
          {h.options.map((o) => (
            <label key={o.mode} className={`grid cursor-pointer grid-cols-[auto_1fr] gap-3 border p-4 has-checked:border-foreground ${o.allowed ? "border-rule bg-surface" : "cursor-not-allowed border-dashed border-rule opacity-70"}`}>
              <input type="radio" name="handling" value={o.mode} disabled={!o.allowed} checked={mode === o.mode}
                onChange={() => setMode(o.mode)} className="mt-1 size-5" />
              <span className="grid gap-1">
                <span className="font-semibold">{t(`modes.${o.mode}.name`)}</span>
                <span className="text-sm text-muted-foreground">{t(`modes.${o.mode}.body`)}</span>
                {!o.allowed && o.reason && <span className="text-sm text-warning">{localized(o.reason)}</span>}
                {o.charges.length > 0 ? <PriceLines lines={o.charges} /> : <span className="text-sm">{t("noFee")}</span>}
              </span>
            </label>
          ))}
          <p className="text-sm text-muted-foreground">{t("finalNote")}</p>
          <Button className="h-12 justify-self-start" onClick={submit} disabled={choose.isPending}>{t("submit")}</Button>
          <ErrorText>{error}</ErrorText>
        </fieldset>
      )}
    </section>
  );
}
