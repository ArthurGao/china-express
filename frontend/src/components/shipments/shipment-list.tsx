"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { JourneyProgress } from "@/components/journey-progress";
import { $api } from "@/lib/api/client";

export function ShipmentList() {
  const t = useTranslations("shipments");
  const tq = useTranslations("quote");
  const list = $api.useQuery("get", "/shipments");

  if (list.isError) return <ErrorText>{t("errors.load")}</ErrorText>;
  if (!list.data) return null;
  if (list.data.length === 0) {
    return (
      <div className="grid gap-3 border border-rule bg-surface p-6">
        <p>{t("empty")}</p>
        <Link href="/quote" className="font-medium underline">{t("startQuote")}</Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-3" data-testid="shipment-list">
      {list.data.map((card) => (
        <li key={card.id}>
          <Link href={card.kind === "SHIPMENT" ? `/shipments/${card.id}` : `/pre-notice/${card.id}`}
            className="grid gap-3 border border-rule bg-surface p-4 hover:border-foreground">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-sm">{card.reference}</span>
              <span className="text-sm text-muted-foreground">
                {tq(`products.${card.product}`)} · {tq(`regions.${card.destination.region}`)}
              </span>
            </div>
            <JourneyProgress step={card.step} exception={card.exception} compact />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {card.parcelsExpected === null
                  ? t("parcelsSoFar", { received: card.parcelsReceived })
                  : t("parcelsOf", { received: card.parcelsReceived, expected: card.parcelsExpected })}
              </span>
              {card.action && <span className="font-semibold text-primary">{t(`actions.${card.action}`)} →</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
