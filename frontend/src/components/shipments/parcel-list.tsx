"use client";

import { MeasurementsText } from "@/components/warehouse/measurement-fields";
import { useTranslations } from "next-intl";
import type { components } from "@/lib/api/generated/schema";
import { When } from "@/components/when";

type CustomerParcel = components["schemas"]["CustomerParcel"];

/** Parcels as measured at the warehouse, with their photos. Measurements are shown exactly as the API sends them. */
export function ParcelList({ parcels }: { parcels: CustomerParcel[] }) {
  const t = useTranslations("shipments.parcels");
  return (
    <ul className="divide-y divide-rule border-y border-rule" data-testid="parcel-list">
      {parcels.map((p) => (
        <li key={p.id} className="grid gap-2 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-sm">{p.parcelNo}</span>
            <span className="text-xs text-muted-foreground">{t("received")} <When iso={p.receivedAt} /></span>
          </div>
          <p className="text-sm">
            {p.trackingNo && <span className="mr-3 font-mono text-muted-foreground">{p.carrier ? `${p.carrier} ` : ""}{p.trackingNo}</span>}
            <MeasurementsText m={p.measurements} />
          </p>
          {p.condition === "DAMAGED" && <p className="text-sm font-medium text-warning">{t("damaged")}</p>}
          {p.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {p.photos.map((photo) => (
                // Signed Storage URLs (or demo stand-ins); next/image would need every storage host configured.
                // eslint-disable-next-line @next/next/no-img-element
                <img key={photo.id} src={photo.url} alt={t(`photo.${photo.kind}`, { parcel: p.parcelNo })} loading="lazy"
                  className="h-20 w-28 shrink-0 border border-rule object-cover" />
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
