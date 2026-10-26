"use client";

import { ErrorText } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { $api, errorStatus, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { useLocalized } from "@/lib/i18n-text";
import { EMPTY_MEASUREMENTS, MeasurementFields, measurementsComplete, MeasurementsText, type Measurements } from "./measurement-fields";

type WhConsolidation = components["schemas"]["WhConsolidation"];
type OutputDraft = { key: string; measurements: Measurements; sourceParcelIds: string[] };

const COUNT = /^\d{1,3}$/;

/**
 * One consolidation job (T2.7): start it, then record each output carton (re-measured, with the parcels packed in it)
 * and how many of each chargeable item were used. The backend prices the charges (C4), checks the 25 kg limit and
 * creates the final-price snapshot.
 */
export function ConsolidationJob({ id }: { id: string }) {
  const t = useTranslations("warehouse.job");
  const th = useTranslations("shipments.handling.modes");
  const localized = useLocalized();
  const queryClient = useQueryClient();
  const options = { params: { path: { consolidationId: id } } };
  const job = $api.useQuery("get", "/wh/consolidations/{consolidationId}", options);
  const start = $api.useMutation("post", "/wh/consolidations/{consolidationId}/start");
  const complete = $api.useMutation("post", "/wh/consolidations/{consolidationId}/complete");
  const [outputs, setOutputs] = useState<OutputDraft[]>([]);
  const [charges, setCharges] = useState<Record<string, string>>({});
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (job.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  const c = job.data;
  if (!c) return null;
  const store = (u: WhConsolidation) => queryClient.setQueryData($api.queryOptions("get", "/wh/consolidations/{consolidationId}", options).queryKey, u);
  const onError = (e: unknown) => setError(t(errorStatus(e) === 409 ? "conflict" : errorStatus(e) === 400 ? "rejected" : "failed"));
  const drafts = outputs.length > 0 ? outputs : [{ key: "1", measurements: EMPTY_MEASUREMENTS, sourceParcelIds: c.parcels.map((p) => p.id) }];

  function update(key: string, patch: Partial<OutputDraft>) {
    setOutputs(drafts.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  }

  function begin() {
    setError(null);
    start.mutate({ params: { path: { consolidationId: id }, header: idem() }, body: { expectedVersion: c!.version } },
      { onSuccess: store, onError });
  }

  function finish(e: React.FormEvent) {
    e.preventDefault();
    const packed = new Set(drafts.flatMap((o) => o.sourceParcelIds));
    const ok = drafts.every((o) => measurementsComplete(o.measurements) && o.sourceParcelIds.length > 0)
      && c!.parcels.every((p) => packed.has(p.id))
      && c!.chargeCodes.every((code) => COUNT.test(charges[code.code] ?? "0"));
    if (!ok) return setInvalid(true);
    setError(null);
    complete.mutate({
      params: { path: { consolidationId: id }, header: idem() },
      body: {
        expectedVersion: c!.version,
        packages: drafts.map(({ measurements, sourceParcelIds }) => ({ measurements, sourceParcelIds })),
        charges: c!.chargeCodes.map((code) => ({ code: code.code, qty: Number.parseInt(charges[code.code] ?? "0", 10) })).filter((x) => x.qty > 0),
      },
    }, { onSuccess: (u) => { store(u); setOutputs([]); }, onError });
  }

  return (
    <div className="grid gap-6 text-base">
      <Link href="/staff/warehouse/consolidations" className="text-sm text-muted-foreground hover:underline">← {t("back")}</Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-mono text-xl font-semibold">{c.reference}</h1>
        <StatusBadge group="consolidation" value={c.status} />
        <span className="font-stencil text-3xl leading-none">{c.memberNo}</span>
        <span className="text-muted-foreground">{th(`${c.mode}.name`)}</span>
      </div>

      <section className="grid gap-2">
        <h2 className="font-semibold">{t("inputs", { count: c.parcels.length })}</h2>
        <table className={DATA_TABLE} data-testid="job-parcels">
          <thead><tr className={DATA_HEAD_ROW}><th>{t("parcelNo")}</th><th>{t("tracking")}</th><th>{t("measurements")}</th></tr></thead>
          <tbody>
            {c.parcels.map((p) => (
              <tr key={p.id} className={DATA_ROW}>
                <td className="font-mono">{p.parcelNo}</td>
                <td className="font-mono">{[p.carrier, p.trackingNo].filter(Boolean).join(" ")}</td>
                <td className="tabular"><MeasurementsText m={p.measurements} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {c.status === "requested" && <Button className="h-14 justify-self-start px-8 text-lg" onClick={begin} disabled={start.isPending}>{t("start")}</Button>}

      {c.status === "in_progress" && (
        <form onSubmit={finish} className="grid gap-5" noValidate>
          <p className="text-muted-foreground">{t("limit", { kg: c.maxPackageKg })}</p>
          {drafts.map((o, i) => (
            <fieldset key={o.key} className="grid gap-3 border border-rule p-4" data-testid={`output-${i + 1}`}>
              <legend className="px-1 font-semibold">{t("carton", { n: i + 1 })}</legend>
              <MeasurementFields idPrefix={`out-${o.key}`} value={o.measurements} invalid={invalid} onChange={(measurements) => update(o.key, { measurements })} />
              <div className="flex flex-wrap gap-3">
                {c.parcels.map((p) => (
                  <label key={p.id} className="flex min-h-11 items-center gap-2 border border-rule px-3">
                    <input type="checkbox" className="size-5" checked={o.sourceParcelIds.includes(p.id)}
                      onChange={(e) => update(o.key, { sourceParcelIds: e.target.checked ? [...o.sourceParcelIds, p.id] : o.sourceParcelIds.filter((x) => x !== p.id) })} />
                    <span className="font-mono">{p.parcelNo}</span>
                  </label>
                ))}
              </div>
              {drafts.length > 1 && (
                <Button type="button" variant="ghost" className="h-12 justify-self-start" onClick={() => setOutputs(drafts.filter((d) => d.key !== o.key))}>{t("removeCarton")}</Button>
              )}
            </fieldset>
          ))}
          <Button type="button" variant="outline" className="h-12 justify-self-start"
            onClick={() => setOutputs([...drafts, { key: String(Date.now()), measurements: EMPTY_MEASUREMENTS, sourceParcelIds: [] }])}>
            {t("addCarton")}
          </Button>

          <fieldset className="grid gap-2">
            <legend className="mb-1 font-semibold">{t("charges")}</legend>
            {c.chargeCodes.map((code) => (
              <label key={code.code} className="grid grid-cols-[1fr_6rem] items-center gap-3">
                <span>{localized(code.label)} <span className="text-sm text-muted-foreground">({t(`units.${code.unit}`)})</span></span>
                <Input inputMode="numeric" aria-label={localized(code.label)} className="tabular h-12 text-lg" value={charges[code.code] ?? ""}
                  placeholder="0" onChange={(e) => setCharges({ ...charges, [code.code]: e.target.value })} />
              </label>
            ))}
          </fieldset>
          {invalid && <ErrorText>{t("incomplete")}</ErrorText>}
          <Button type="submit" className="h-14 justify-self-start px-8 text-lg" disabled={complete.isPending}>{t("complete")}</Button>
        </form>
      )}

      {c.status === "completed" && (
        <section className="grid gap-2" data-testid="job-outputs">
          <p role="status" className="font-semibold text-success">{t("completed")}</p>
          <table className={DATA_TABLE}>
            <thead><tr className={DATA_HEAD_ROW}><th>{t("packageNo")}</th><th>{t("measurements")}</th><th>{t("contains")}</th></tr></thead>
            <tbody>
              {c.outputs.map((o) => (
                <tr key={o.packageNo} className={DATA_ROW}>
                  <td className="font-mono">{o.packageNo}</td>
                  <td className="tabular"><MeasurementsText m={o.measurements} /></td>
                  <td className="font-mono">{o.sourceParcelNos.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
