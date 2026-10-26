"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Money } from "@/components/money";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { $api } from "@/lib/api/client";
import { useLocalized } from "@/lib/i18n-text";

/** Stage 3 reports (T3.8): revenue and volume as the backend totals them. Profit waits for the cost rules (DECISION(X-6)). */
export function Reports() {
  const t = useTranslations("admin.reports");
  const tq = useTranslations("quote.products");
  const localized = useLocalized();
  const [range, setRange] = useState({ from: "", to: "" });
  const report = $api.useQuery("get", "/admin/reports/summary", {
    params: { query: range.from && range.to ? { from: range.from, to: range.to } : {} },
  });
  const r = report.data;
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-3">
        <div className="grid gap-1"><Label htmlFor="report-from">{t("from")}</Label>
          <Input id="report-from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
        <div className="grid gap-1"><Label htmlFor="report-to">{t("to")}</Label>
          <Input id="report-to" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
      </div>
      {report.isError && <ErrorText>{t("loadFailed")}</ErrorText>}
      {r && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="grid content-start gap-2">
            <h2 className="font-semibold">{t("revenue")}</h2>
            <table className={DATA_TABLE} data-testid="revenue">
              <thead><tr className={DATA_HEAD_ROW}><th>{t("month")}</th><th className="text-right">{t("exGst")}</th></tr></thead>
              <tbody>
                {r.revenue.map((row) => (
                  <tr key={`${row.month}-${row.currency}`} className={DATA_ROW}>
                    <td className="tabular">{row.month}</td>
                    <td className="text-right"><Money amount={row.amountExGst} currency={row.currency} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">{t("currencyNote")}</p>
          </section>
          <section className="grid content-start gap-2">
            <h2 className="font-semibold">{t("volume")}</h2>
            <table className={DATA_TABLE} data-testid="volume">
              <thead><tr className={DATA_HEAD_ROW}><th>{t("month")}</th><th className="text-right">{t("shipments")}</th><th className="text-right">{t("chargeableKg")}</th></tr></thead>
              <tbody>
                {r.volume.map((row) => (
                  <tr key={row.month} className={DATA_ROW}>
                    <td className="tabular">{row.month}</td><td className="tabular text-right">{row.shipments}</td><td className="tabular text-right">{row.chargeableKg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="grid content-start gap-2">
            <h2 className="font-semibold">{t("byProduct")}</h2>
            <table className={DATA_TABLE}>
              <tbody>
                {r.byProduct.map((row) => (
                  <tr key={row.product} className={DATA_ROW}><td>{tq(row.product)}</td><td className="tabular text-right">{row.shipments}</td></tr>
                ))}
              </tbody>
            </table>
            {!r.profitAvailable && <p role="note" className="border border-rule bg-surface p-3 text-sm">{localized(r.profitNote)}</p>}
          </section>
        </div>
      )}
    </div>
  );
}
