"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "./data-table";

// Edits rate values as decimal strings; nothing here calculates a price. Shape follows design 04 (rate card payload).
export type Tier = { fromKg: string; perKg: string };
export type SeaParcelPayload = {
  product: "SEA_PARCEL";
  regions: Record<"AKL" | "NI_OTHER" | "SI", { tiers: Tier[] }>;
  tierMode: "WHOLE" | "INCREMENTAL" | "WHOLE_WITH_FLOOR";
  clearance: Record<"LT_400" | "B400_1000" | "GTE_1000", string>;
  [key: string]: unknown;
};

const REGIONS = ["AKL", "NI_OTHER", "SI"] as const;
const BANDS = ["LT_400", "B400_1000", "GTE_1000"] as const;
const TIER_MODES = ["WHOLE_WITH_FLOOR", "WHOLE", "INCREMENTAL"] as const;
export const DECIMAL = /^\d+(\.\d{1,2})?$/;

export function isSeaParcelPayload(p: unknown): p is SeaParcelPayload {
  const x = p as SeaParcelPayload;
  return !!x && x.product === "SEA_PARCEL" && !!x.regions && !!x.clearance && REGIONS.every((r) => Array.isArray(x.regions[r]?.tiers));
}

export function seaParcelValid(p: SeaParcelPayload): boolean {
  return REGIONS.every((r) => p.regions[r].tiers.every((t) => DECIMAL.test(t.fromKg) && DECIMAL.test(t.perKg)))
    && BANDS.every((b) => DECIMAL.test(p.clearance[b]));
}

export function SeaParcelEditor({ value, onChange, readOnly }: {
  value: SeaParcelPayload; onChange?: (next: SeaParcelPayload) => void; readOnly: boolean;
}) {
  const t = useTranslations("rates.editor");

  function setTier(region: (typeof REGIONS)[number], i: number, field: keyof Tier, v: string) {
    const next = structuredClone(value);
    next.regions[region].tiers[i][field] = v;
    onChange?.(next);
  }
  function setBand(band: (typeof BANDS)[number], v: string) {
    const next = structuredClone(value);
    next.clearance[band] = v;
    onChange?.(next);
  }

  const cell = (id: string, label: string, v: string, set: (v: string) => void) => (
    <Input id={id} aria-label={label} value={v} readOnly={readOnly} onChange={(e) => set(e.target.value)} inputMode="decimal"
      aria-invalid={!DECIMAL.test(v)} className="tabular h-8 w-24 text-right" />
  );

  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h3 className="font-semibold">{t("regions")}</h3>
        <table className={DATA_TABLE}>
          <thead>
            <tr className={DATA_HEAD_ROW}>
              <th />
              <th className="w-32 text-right">{t("fromKg")}</th>
              <th className="w-32 text-right">{t("perKg")}</th>
            </tr>
          </thead>
          <tbody>
            {REGIONS.flatMap((r) => value.regions[r].tiers.map((tier, i) => (
              <tr key={`${r}-${i}`} className={DATA_ROW}>
                <td className={i === 0 ? "" : "text-muted-foreground"}>{t(`regionNames.${r}`)}</td>
                <td><div className="flex justify-end">{cell(`${r}-${i}-from`, `${t(`regionNames.${r}`)} ${t("fromKg")} ${i + 1}`, tier.fromKg, (v) => setTier(r, i, "fromKg", v))}</div></td>
                <td><div className="flex justify-end">{cell(`${r}-${i}-per`, `${t(`regionNames.${r}`)} ${t("perKg")} ${i + 1}`, tier.perKg, (v) => setTier(r, i, "perKg", v))}</div></td>
              </tr>
            )))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-2">
        <h3 className="font-semibold">{t("clearance")}</h3>
        <div className="flex flex-wrap gap-4">
          {BANDS.map((b) => (
            <label key={b} className="grid gap-1 text-[13px]">
              <span className="text-muted-foreground">{t(`bands.${b}`)}</span>
              {cell(`clearance-${b}`, `${t("clearance")} ${t(`bands.${b}`)}`, value.clearance[b], (v) => setBand(b, v))}
            </label>
          ))}
        </div>
      </section>

      <label className="grid max-w-sm gap-1 text-[13px]">
        <span className="font-semibold">{t("tierMode")}</span>
        <select value={value.tierMode} disabled={readOnly} className="h-8 border border-input bg-surface px-2"
          onChange={(e) => onChange?.({ ...structuredClone(value), tierMode: e.target.value as SeaParcelPayload["tierMode"] })}>
          {TIER_MODES.map((m) => <option key={m} value={m}>{t(`tierModes.${m}`)}</option>)}
        </select>
      </label>

      {!readOnly && !seaParcelValid(value) && <p className="text-destructive">{t("invalidNumber")}</p>}
    </div>
  );
}
