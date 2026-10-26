"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Money } from "@/components/money";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { When } from "@/components/when";
import { $api } from "@/lib/api/client";

/** Stage 3: daily three-way match of gateway settlements, platform payments and Xero, plus the Xero sync state. */
export function Reconciliation() {
  const t = useTranslations("finance.reconciliation");
  const [date, setDate] = useState("");
  const report = $api.useQuery("get", "/finance/reconciliation", { params: { query: date ? { date } : {} } });
  const r = report.data;
  return (
    <div className="grid gap-4">
      <div className="flex items-end gap-2">
        <div className="grid gap-1"><Label htmlFor="recon-date">{t("date")}</Label>
          <Input id="recon-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      {report.isError && <ErrorText>{t("loadFailed")}</ErrorText>}
      {r && (
        <>
          <p className="flex flex-wrap gap-4" data-testid="xero-sync">
            <span>{t("xeroLast")} {r.xeroSync.lastRunAt ? <When iso={r.xeroSync.lastRunAt} /> : "—"}</span>
            <span>{t("xeroPending", { count: r.xeroSync.pending })}</span>
            <span className={r.xeroSync.failed > 0 ? "font-semibold text-destructive" : ""}>{t("xeroFailed", { count: r.xeroSync.failed })}</span>
          </p>
          <table className={DATA_TABLE} data-testid="reconciliation">
            <thead><tr className={DATA_HEAD_ROW}><th>{t("gateway")}</th><th>{t("platform")}</th><th>{t("xero")}</th><th className="text-right">{t("amount")}</th><th>{t("result")}</th></tr></thead>
            <tbody>
              {r.rows.map((row, i) => (
                <tr key={`${row.gatewayRef}-${i}`} className={DATA_ROW}>
                  <td className="font-mono">{row.gatewayRef ?? "—"}</td>
                  <td className="font-mono">{row.paymentNo ?? "—"}</td>
                  <td className="font-mono">{row.xeroId ?? "—"}</td>
                  <td className="text-right"><Money amount={row.amount} currency={row.currency} /></td>
                  <td className={row.status === "MATCHED" ? "text-success" : "font-medium text-warning"}>{t(`statuses.${row.status}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
