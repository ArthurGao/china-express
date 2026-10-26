"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/section-heading";
import { $api, fetchClient } from "@/lib/api/client";
import type { EstimateRequest } from "@/lib/api/types";
import { toMoneyString } from "@/lib/money";
import { QUANTITY } from "@/lib/validation";

const REGIONS = ["AKL", "NI_OTHER", "SI"] as const;
// Client validation is for UX only; the backend validates again and is the authority.
const positiveDecimal = z.string().trim().regex(/^(?!0+(\.0+)?$)\d+(\.\d{1,3})?$/, "positive");

const formSchema = z
  .object({
    region: z.enum(REGIONS, { message: "region" }),
    cityId: z.string(),
    postcode: z.string(),
    cartons: z
      .array(
        z.object({
          lengthCm: positiveDecimal,
          widthCm: positiveDecimal,
          heightCm: positiveDecimal,
          weightKg: positiveDecimal,
          quantity: z.string().trim().regex(QUANTITY, "qty"),
        }),
      )
      .min(1),
    declaredValue: z.string().refine((v) => toMoneyString(v) !== null, "money"),
  })
  .refine((v) => v.cityId !== "" || v.postcode !== "", { path: ["cityId"], message: "city" });

export type QuoteFormValues = z.infer<typeof formSchema>;

const CARTON_FIELDS = ["lengthCm", "widthCm", "heightCm", "weightKg"] as const;
const CARTON_INPUTS = [
  ["lengthCm", "cargo.length"], ["widthCm", "cargo.width"], ["heightCm", "cargo.height"],
  ["weightKg", "cargo.weight"], ["quantity", "cargo.qty"],
] as const;
const emptyCarton = { lengthCm: "", widthCm: "", heightCm: "", weightKg: "", quantity: "1" };

export function toEstimateRequest(v: QuoteFormValues): EstimateRequest {
  return {
    destination: {
      region: v.region,
      ...(v.cityId ? { cityId: v.cityId } : {}),
      ...(v.postcode ? { postcode: v.postcode } : {}),
    },
    cartons: v.cartons.map((c) => ({
      lengthCm: c.lengthCm.trim(),
      widthCm: c.widthCm.trim(),
      heightCm: c.heightCm.trim(),
      weightKg: c.weightKg.trim(),
      quantity: Number.parseInt(c.quantity, 10),
    })),
    declaredValueNzd: toMoneyString(v.declaredValue)!,
  };
}

export function QuoteForm({ onSubmit, submitting }: { onSubmit: (req: EstimateRequest) => void; submitting: boolean }) {
  const t = useTranslations("quote");
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { cityId: "", postcode: "", cartons: [emptyCarton], declaredValue: "" },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "cartons" });
  const region = useWatch({ control: form.control, name: "region" });
  const errors = form.formState.errors;

  const cities = $api.useQuery("get", "/destinations/cities", { params: { query: { region: region ?? "AKL" } } }, { enabled: !!region, staleTime: 60 * 60_000 });
  const regionCities = (cities.data ?? []).filter((c) => c.region === region);

  const [showPostcode, setShowPostcode] = useState(false);
  const [postcodeInput, setPostcodeInput] = useState("");
  const [postcodeResult, setPostcodeResult] = useState<{ zone: string; quoteOnRequest: boolean } | "notFound" | null>(null);

  async function checkPostcode() {
    if (!/^\d{4}$/.test(postcodeInput)) return setPostcodeResult("notFound");
    const { data } = await fetchClient.GET("/destinations/postcodes/{postcode}", { params: { path: { postcode: postcodeInput } } });
    if (!data) return setPostcodeResult("notFound");
    form.setValue("region", data.region, { shouldValidate: true });
    form.setValue("cityId", data.cityId ?? "", { shouldValidate: true });
    form.setValue("postcode", data.postcode, { shouldValidate: true });
    setPostcodeResult({ zone: data.zoneName, quoteOnRequest: data.quoteOnRequest });
  }

  const fieldError = (key: string | undefined) => (key ? t(`errors.${key}`) : null);

  return (
    <form onSubmit={form.handleSubmit((v) => onSubmit(toEstimateRequest(v)))} className="grid gap-10" noValidate>
      <section className="grid gap-4">
        <SectionHeading n="01" title={t("where.title")} />
        <fieldset className="grid gap-2">
          <legend className="sr-only">{t("where.region")}</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {REGIONS.map((r) => (
              <label key={r} className="flex h-12 cursor-pointer items-center gap-3 border border-rule bg-surface px-4 has-[:checked]:border-2 has-[:checked]:border-foreground">
                <input type="radio" value={r} className="accent-foreground" {...form.register("region", {
                  onChange: () => { form.setValue("cityId", ""); form.setValue("postcode", ""); setPostcodeResult(null); },
                })} />
                {t(`regions.${r}`)}
              </label>
            ))}
          </div>
          {errors.region && <p className="text-sm text-destructive">{fieldError(errors.region.message)}</p>}
        </fieldset>

        {region && (
          <div className="grid gap-2">
            <Label htmlFor="cityId">{t("where.city")}</Label>
            <select id="cityId" className="h-12 border border-input bg-surface px-3" {...form.register("cityId")}>
              <option value="">{t("where.choose")}</option>
              {regionCities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <p className="text-sm text-muted-foreground">{t("where.cityHint")}</p>
            {errors.cityId && <p className="text-sm text-destructive">{fieldError(errors.cityId.message)}</p>}
          </div>
        )}

        <div className="grid gap-2">
          <Button type="button" variant="link" className="h-11 justify-self-start px-0" onClick={() => setShowPostcode((s) => !s)}>
            {t("where.postcodeLink")}
          </Button>
          {showPostcode && (
            <div className="flex items-end gap-2">
              <div className="grid gap-2">
                <Label htmlFor="postcode">{t("where.postcode")}</Label>
                <Input id="postcode" inputMode="numeric" maxLength={4} className="h-12 w-28 font-mono"
                  value={postcodeInput} onChange={(e) => setPostcodeInput(e.target.value)} />
              </div>
              <Button type="button" variant="outline" className="h-12" onClick={checkPostcode}>{t("where.check")}</Button>
            </div>
          )}
          {postcodeResult === "notFound" && <p className="text-sm text-destructive">{t("where.postcodeNotFound")}</p>}
          {postcodeResult && postcodeResult !== "notFound" && (
            <p className="text-sm">
              {t("where.postcodeFound", { zone: postcodeResult.zone })}
              {postcodeResult.quoteOnRequest && <span className="block text-warning">{t("where.quoteOnRequest")}</span>}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4">
        <SectionHeading n="02" title={t("cargo.title")} />
        <p className="text-sm text-muted-foreground">{t("cargo.intro")}</p>
        <ol className="grid gap-4">
          {fields.map((field, i) => {
            const rowErrors = errors.cartons?.[i];
            const cell = (name: (typeof CARTON_INPUTS)[number][0], label: string) => (
              <div key={name} className="grid gap-1">
                <Label htmlFor={`cartons.${i}.${name}`} className="text-xs text-muted-foreground">{label}</Label>
                <Input id={`cartons.${i}.${name}`} inputMode={name === "quantity" ? "numeric" : "decimal"}
                  className="tabular h-12" aria-invalid={!!rowErrors?.[name]} {...form.register(`cartons.${i}.${name}`)} />
              </div>
            );
            return (
              <li key={field.id} className="grid gap-2 border border-rule bg-surface p-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  {t("cargo.item", { n: i + 1 })}
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" className="h-11 min-w-11 text-lg" onClick={() => remove(i)} aria-label={t("cargo.remove", { n: i + 1 })}>×</Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {CARTON_INPUTS.map(([name, label]) => cell(name, t(label)))}
                </div>
                {rowErrors && (
                  <p className="text-sm text-destructive">
                    {fieldError(rowErrors.quantity?.message ?? CARTON_FIELDS.map((k) => rowErrors[k]?.message).find(Boolean))}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <Button type="button" variant="outline" className="h-11 justify-self-start" onClick={() => append(emptyCarton)}>
          {t("cargo.add")}
        </Button>

        <div className="grid gap-2">
          <Label htmlFor="declaredValue">{t("value.label")}</Label>
          <div className="flex h-12 items-center border border-input bg-surface">
            <span className="px-3 text-muted-foreground">NZ$</span>
            <input id="declaredValue" inputMode="decimal" className="tabular h-full flex-1 bg-transparent pr-3 outline-none"
              aria-invalid={!!errors.declaredValue} {...form.register("declaredValue")} />
          </div>
          <p className="text-sm text-muted-foreground">{t("value.hint")}</p>
          {errors.declaredValue && <p className="text-sm text-destructive">{fieldError(errors.declaredValue.message)}</p>}
        </div>
      </section>

      <Button type="submit" size="lg" className="h-12 justify-self-start px-8 text-base" disabled={submitting}>
        {t("submit")}
      </Button>
    </form>
  );
}
