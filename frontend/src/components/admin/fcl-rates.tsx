"use client";

import { upsertById } from "@/lib/api/cache";
import { ErrorText } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Money } from "@/components/money";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { ReasonDialog } from "@/components/reason-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { When } from "@/components/when";
import { $api, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { uploadFile } from "@/lib/files";

type Sheet = components["schemas"]["FclRateSheet"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Stage 3 FCL rate sheets (T3.6): import a file as a draft, check it, publish. Expired sheets stop quoting (G3). */
export function FclRates() {
  const t = useTranslations("admin.fcl");
  const queryClient = useQueryClient();
  const sheets = $api.useQuery("get", "/admin/fcl-rate-sheets");
  const importSheet = $api.useMutation("post", "/admin/fcl-rate-sheets/import");
  const publish = $api.useMutation("post", "/admin/fcl-rate-sheets/{sheetId}/publish");
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<{ file: File | null; validFrom: string; validTo: string }>({ file: null, validFrom: "", validTo: "" });
  const [error, setError] = useState<string | null>(null);
  const key = $api.queryOptions("get", "/admin/fcl-rate-sheets").queryKey;
  const put = (u: Sheet) => queryClient.setQueryData(key, upsertById(u, "start"));

  if (sheets.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  const current = sheets.data?.find((s) => s.id === selected) ?? sheets.data?.[0];
  const live = sheets.data?.find((s) => s.status === "published");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file || !DATE.test(form.validFrom) || !DATE.test(form.validTo)) return setError(t("importInvalid"));
    setError(null);
    try {
      const fileId = await uploadFile(form.file, "fcl_rate_sheet");
      importSheet.mutate({ params: { header: idem() }, body: { fileId, validFrom: form.validFrom, validTo: form.validTo } }, {
        onSuccess: (s) => { put(s); setSelected(s.id); },
        onError: () => setError(t("importFailed")),
      });
    } catch {
      setError(t("importFailed"));
    }
  }

  return (
    <div className="grid gap-6">
      {live?.expired && <p role="alert" className="border border-rule bg-surface p-3 font-medium text-warning">{t("expired", { date: live.validTo })}</p>}
      <table className={DATA_TABLE} data-testid="fcl-sheets">
        <thead><tr className={DATA_HEAD_ROW}><th className="text-right">{t("version")}</th><th>{t("status")}</th><th>{t("valid")}</th><th>{t("source")}</th><th>{t("imported")}</th><th /></tr></thead>
        <tbody>
          {sheets.data?.map((s) => (
            <tr key={s.id} className={`${DATA_ROW} ${current?.id === s.id ? "bg-accent" : ""}`}>
              <td className="tabular text-right">v{s.version}</td>
              <td className="flex gap-1"><StatusBadge group="rateSheet" value={s.status} />{s.expired && <StatusBadge group="rateSheet" value="expired" />}</td>
              <td className="font-mono text-xs">{s.validFrom} → {s.validTo}</td>
              <td className="font-mono text-xs">{s.sourceFile}</td>
              <td>{s.importedBy} · <When iso={s.importedAt} date /></td>
              <td className="text-right"><Button size="sm" variant="outline" onClick={() => setSelected(s.id)}>{t("view")}</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {current && (
        <section className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">{t("ratesOf", { version: current.version })}</h2>
            {current.status === "draft" && (
              <ReasonDialog trigger={t("publish")} triggerVariant="default" title={t("publishTitle", { version: current.version })}
                description={t("publishBody", { from: current.validFrom })} confirmLabel={t("publish")} pending={publish.isPending}
                onConfirm={(reason) => publish.mutate({ params: { path: { sheetId: current.id }, header: idem() }, body: { reason } },
                  { onSuccess: put })} />
            )}
          </div>
          <table className={DATA_TABLE} data-testid="fcl-rates">
            <thead><tr className={DATA_HEAD_ROW}><th>{t("origin")}</th><th>{t("destination")}</th><th className="text-right">20&apos;</th><th className="text-right">40&apos;</th></tr></thead>
            <tbody>
              {current.rates.map((r) => (
                <tr key={`${r.origin}-${r.destination}`} className={DATA_ROW}>
                  <td>{r.origin}</td><td>{r.destination}</td>
                  <td className="text-right"><Money amount={r.size20} currency={current.currency} /></td>
                  <td className="text-right"><Money amount={r.size40} currency={current.currency} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <form onSubmit={submit} className="grid max-w-xl gap-3 border border-rule bg-surface p-4" noValidate data-testid="fcl-import">
        <h2 className="font-semibold">{t("importTitle")}</h2>
        <Label htmlFor="fcl-file">{t("file")}</Label>
        <Input id="fcl-file" type="file" accept=".xlsx,.csv" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1"><Label htmlFor="fcl-from">{t("validFrom")}</Label>
            <Input id="fcl-from" type="date" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} /></div>
          <div className="grid gap-1"><Label htmlFor="fcl-to">{t("validTo")}</Label>
            <Input id="fcl-to" type="date" value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} /></div>
        </div>
        <ErrorText className="text-sm">{error}</ErrorText>
        <Button type="submit" className="justify-self-start" disabled={importSheet.isPending}>{t("import")}</Button>
      </form>
    </div>
  );
}
