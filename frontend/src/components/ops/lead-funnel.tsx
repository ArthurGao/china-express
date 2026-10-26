"use client";

import { ErrorText } from "@/components/feedback";
import { useFormatter, useTranslations } from "next-intl";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { $api } from "@/lib/api/client";

/** Visitors per source through the funnel; each stage also shown as a share of that source's landings. */
export function LeadFunnel() {
  const t = useTranslations("ops.leads");
  const format = useFormatter();
  const funnel = $api.useQuery("get", "/ops/leads/funnel");
  if (funnel.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  const f = funnel.data;
  if (!f) return null;
  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground">{t("period", { from: f.from, to: f.to })}</p>
      <table className={DATA_TABLE} data-testid="funnel">
        <thead>
          <tr className={DATA_HEAD_ROW}><th>{t("source")}</th>{f.stages.map((s) => <th key={s} className="text-right">{t(`stages.${s}`)}</th>)}</tr>
        </thead>
        <tbody>
          {f.rows.map((row) => (
            <tr key={row.source} className={DATA_ROW}>
              <td className="font-mono">{row.source}</td>
              {row.counts.map((count, i) => (
                <td key={f.stages[i]} className="tabular text-right">
                  {count}
                  {i > 0 && row.counts[0] > 0 && (
                    <span className="ml-2 text-muted-foreground">{format.number(count / row.counts[0], { style: "percent", maximumFractionDigits: 0 })}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
