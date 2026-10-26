"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { components } from "@/lib/api/generated/schema";
import { POSITIVE_DECIMAL } from "@/lib/validation";

export type Measurements = components["schemas"]["Measurements"];
export const EMPTY_MEASUREMENTS: Measurements = { weightKg: "", lengthCm: "", widthCm: "", heightCm: "" };
const FIELDS = ["weightKg", "lengthCm", "widthCm", "heightCm"] as const;

/** All four values present and well formed (text check only; the backend validates and computes). */
export function measurementsComplete(m: Measurements): boolean {
  return FIELDS.every((f) => POSITIVE_DECIMAL.test(m[f].trim()));
}

/** Large inputs for the warehouse tablet: weight first (the scale), then the three sides. */
export function MeasurementFields({ value, onChange, idPrefix = "m", invalid = false }: {
  value: Measurements; onChange: (m: Measurements) => void; idPrefix?: string; invalid?: boolean;
}) {
  const t = useTranslations("warehouse.measure");
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {FIELDS.map((f) => (
        <div key={f} className="grid gap-1">
          <Label htmlFor={`${idPrefix}-${f}`} className="text-base">{t(f)}</Label>
          <Input id={`${idPrefix}-${f}`} inputMode="decimal" className="tabular h-14 text-xl" value={value[f]}
            aria-invalid={invalid && !POSITIVE_DECIMAL.test(value[f].trim())}
            onChange={(e) => onChange({ ...value, [f]: e.target.value })} />
        </div>
      ))}
    </div>
  );
}

/** "4.2 kg · 40 × 30 × 25 cm", exactly as the API sent the values. */
export function MeasurementsText({ m }: { m: Measurements }) {
  const t = useTranslations("shipments.parcels");
  return <span className="tabular">{t("measured", { kg: m.weightKg, l: m.lengthCm, w: m.widthCm, h: m.heightCm })}</span>;
}
