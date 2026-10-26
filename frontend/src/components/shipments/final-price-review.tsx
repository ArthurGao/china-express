"use client";

import { ErrorText } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PriceLines, TotalAmount } from "@/components/money";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import { When } from "@/components/when";
import { $api, errorStatus, newIdempotencyKey } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

type ShipmentDetail = components["schemas"]["ShipmentDetail"];

// Charges that can still follow a final price (DECISION(E3)), worded as on the quote page.
const LATER_CHARGES = ["residential", "inspection", "quarantine", "storage", "dangerous", "oversize"] as const;

/**
 * Estimate next to final price, both exactly as the backend priced them (no difference is computed here), then the
 * customer accepts. Accepting sends the version they looked at, so a price that changed meanwhile is refused (409).
 */
export function FinalPriceReview({ shipment, n }: { shipment: ShipmentDetail; n: string }) {
  const t = useTranslations("shipments.final");
  const tq = useTranslations("quote.excluded");
  const queryClient = useQueryClient();
  const confirm = $api.useMutation("post", "/shipments/{shipmentId}/confirm-final");
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [error, setError] = useState<string | null>(null);
  if (!shipment.final) return null;

  function accept() {
    setError(null);
    confirm.mutate(
      {
        params: { path: { shipmentId: shipment.id }, header: { "Idempotency-Key": idempotencyKey } },
        body: { expectedVersion: shipment.version },
      },
      {
        onSuccess: (updated) =>
          queryClient.setQueryData($api.queryOptions("get", "/shipments/{shipmentId}", { params: { path: { shipmentId: shipment.id } } }).queryKey, updated),
        onError: (e) => setError(t(errorStatus(e) === 409 ? "changed" : "failed")),
      },
    );
  }

  return (
    <section className="grid gap-4 border border-foreground bg-surface p-4" aria-labelledby="final-title">
      <SectionHeading id="final-title" n={n} title={t("title")} />
      <div className="grid gap-6 sm:grid-cols-2">
        {shipment.estimate && (
          <div className="grid content-start gap-2" data-testid="estimate-price">
            <h3 className="text-sm font-medium text-muted-foreground">{t("estimate")}</h3>
            <PriceLines lines={shipment.estimate.lines} />
            {shipment.estimate.totals.map((total) => <TotalAmount key={total.currency} total={total} className="font-semibold" />)}
          </div>
        )}
        <div className="grid content-start gap-2" data-testid="final-price">
          <h3 className="text-sm font-medium">{t("final")}</h3>
          <PriceLines lines={shipment.final.lines} />
          {shipment.final.totals.map((total) => <TotalAmount key={total.currency} total={total} className="text-xl font-semibold" />)}
        </div>
      </div>
      {shipment.final.expiresAt && <p className="text-sm text-muted-foreground">{t("validUntil")} <When iso={shipment.final.expiresAt} /></p>}
      <p className="text-sm text-muted-foreground">
        {t("later")} {LATER_CHARGES.map((k) => tq(`items.${k}`)).join(", ")}.
      </p>
      <Button className="h-12 justify-self-start" onClick={accept} disabled={confirm.isPending}>{t("confirm")}</Button>
      <ErrorText>{error}</ErrorText>
    </section>
  );
}
