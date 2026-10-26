"use client";

import { MeasurementsText } from "@/components/warehouse/measurement-fields";
import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { JourneyProgress } from "@/components/journey-progress";
import { PriceLines, TotalAmount } from "@/components/money";
import { SectionHeading } from "@/components/section-heading";
import { StatusBadge } from "@/components/status-badge";
import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { FinalPriceReview } from "./final-price-review";
import { ParcelList } from "./parcel-list";
import { PaymentPanel } from "./payment-panel";
import { Timeline } from "./timeline";

type ShipmentDetail = components["schemas"]["ShipmentDetail"];

export function ShipmentView({ id }: { id: string }) {
  const t = useTranslations("shipments");
  const tq = useTranslations("quote");
  const shipment = $api.useQuery("get", "/shipments/{shipmentId}", { params: { path: { shipmentId: id } } });

  if (shipment.isError) return <ErrorText>{t("errors.load")}</ErrorText>;
  const s = shipment.data;
  if (!s) return null;
  // Sections are numbered in reading order (swiss-grid section markers), counting only those shown.
  const review = s.actions.includes("CONFIRM_FINAL_PRICE");
  const shown = [review, !!s.receivable, !review && !!s.final, s.packages.length > 0, s.parcels.length > 0, true];
  const n = (index: number) => String(shown.slice(0, index + 1).filter(Boolean).length).padStart(2, "0");

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <Link href="/shipments" className="inline-flex min-h-11 items-center justify-self-start text-sm text-muted-foreground hover:underline">← {t("back")}</Link>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-mono text-2xl font-semibold" data-testid="shipment-no">{s.shipmentNo}</h1>
          <StatusBadge group="shipment" value={s.status} />
        </div>
        <p className="text-sm text-muted-foreground">{tq(`products.${s.product}`)} · {tq(`regions.${s.destination.region}`)}</p>
        <JourneyProgress step={s.step} exception={s.exception} />
        {s.trackingUrl && (
          <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-self-start text-sm font-medium underline">{t("track")}</a>
        )}
      </div>

      {review && <FinalPriceReview shipment={s} n={n(0)} />}
      <PaymentPanel shipment={s} n={n(1)} />
      {!review && s.final && (
        <section className="grid gap-2">
          <SectionHeading n={n(2)} title={t("final.agreed")} />
          <FinalLines shipment={s} />
        </section>
      )}

      {s.packages.length > 0 && (
        <section className="grid gap-2">
          <SectionHeading n={n(3)} title={t("packages")} />
          <ul className="divide-y divide-rule border-y border-rule text-sm">
            {s.packages.map((p) => (
              <li key={p.packageNo} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="font-mono">{p.packageNo}</span>
                <MeasurementsText m={p.measurements} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {s.parcels.length > 0 && (
        <section className="grid gap-2">
          <SectionHeading n={n(4)} title={t("parcels.title")} />
          <ParcelList parcels={s.parcels} />
        </section>
      )}

      <section className="grid gap-3">
        <SectionHeading n={n(5)} title={t("history")} />
        <Timeline events={s.timeline} />
      </section>
    </div>
  );
}

function FinalLines({ shipment }: { shipment: ShipmentDetail }) {
  if (!shipment.final) return null;
  return (
    <div className="grid gap-2" data-testid="final-price">
      <PriceLines lines={shipment.final.lines} />
      {shipment.final.totals.map((total) => <TotalAmount key={total.currency} total={total} className="font-semibold" />)}
    </div>
  );
}
