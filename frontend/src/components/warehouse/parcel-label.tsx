"use client";

import JsBarcode from "jsbarcode";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import type { components } from "@/lib/api/generated/schema";

type WhParcel = components["schemas"]["WhParcel"];

/** 4×6 in carton label; the barcode is the internal parcel number (design 07). Prints on its own page. */
export function ParcelLabel({ parcel }: { parcel: WhParcel }) {
  const t = useTranslations("warehouse.label");
  const tq = useTranslations("quote");
  const barcode = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (barcode.current) JsBarcode(barcode.current, parcel.parcelNo, { format: "CODE128", displayValue: false, margin: 0, height: 70, width: 2 });
  }, [parcel.parcelNo]);

  return (
    <div className="print-label parcel-label grid aspect-[4/6] w-72 content-between gap-2 border border-foreground bg-white p-4 text-black" data-testid="parcel-label">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold tracking-[0.12em] uppercase">China Express</span>
        <span>{parcel.preNotice ? tq(`products.${parcel.preNotice.product}`) : t("noProduct")}</span>
      </div>
      <p className="font-stencil text-4xl leading-none" data-testid="label-mark">{parcel.memberNo ?? t("unclaimed")}</p>
      <div className="grid gap-1">
        <svg ref={barcode} role="img" aria-label={t("barcode", { parcelNo: parcel.parcelNo })} className="h-20 w-full" />
        <p className="text-center font-mono text-lg font-semibold">{parcel.parcelNo}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-xs">
        <dt>{t("weight")}</dt><dd className="tabular">{parcel.measurements.weightKg} kg</dd>
        <dt>{t("size")}</dt><dd className="tabular">{parcel.measurements.lengthCm}×{parcel.measurements.widthCm}×{parcel.measurements.heightCm} cm</dd>
        {parcel.preNotice && <><dt>{t("to")}</dt><dd>{tq(`regions.${parcel.preNotice.destinationRegion}`)} · {parcel.preNotice.reference}</dd></>}
      </dl>
    </div>
  );
}
