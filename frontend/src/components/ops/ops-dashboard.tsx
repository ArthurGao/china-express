"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { StatusBadge } from "@/components/status-badge";
import { When } from "@/components/when";
import { $api } from "@/lib/api/client";
import { LIVE } from "@/lib/live/use-live-updates";
import { useLocalized } from "@/lib/i18n-text";

export function OpsDashboard() {
  const t = useTranslations("ops.dashboard");
  const tj = useTranslations("journey.exceptions");
  const localized = useLocalized();
  // Live updates refresh it on each event; poll only where there is no event stream (mock and demo builds).
  const dashboard = $api.useQuery("get", "/ops/dashboard", {}, { refetchInterval: LIVE ? false : 60_000 });
  if (dashboard.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  const d = dashboard.data;
  if (!d) return null;
  return (
    <div className="grid gap-6">
      {(["parcel", "shipment"] as const).map((group) => (
        <section key={group} className="grid gap-2">
          <h2 className="font-semibold">{t(`groups.${group}`)}</h2>
          <ul className="grid grid-cols-2 border-t border-l border-rule sm:grid-cols-3 lg:grid-cols-6" data-testid={`counts-${group}`}>
            {d.counts.filter((c) => c.group === group).map((c) => (
              <li key={c.status} className="grid gap-1 border-r border-b border-rule bg-surface p-3">
                <StatusBadge group={group} value={c.status} className="justify-self-start" />
                <span className="tabular text-2xl font-semibold">{c.count}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="grid gap-2">
        <h2 className="font-semibold">{t("exceptions")}</h2>
        <table className={DATA_TABLE} data-testid="exceptions">
          <thead><tr className={DATA_HEAD_ROW}><th>{t("kind")}</th><th>{t("reference")}</th><th>{t("note")}</th><th>{t("since")}</th></tr></thead>
          <tbody>
            {d.exceptions.map((e) => (
              <tr key={e.reference} className={DATA_ROW}>
                <td className="font-medium text-warning">{tj(e.kind)}</td>
                <td><Link className="font-mono underline" href={e.href}>{e.reference}</Link></td>
                <td>{localized(e.note)}</td>
                <td><When iso={e.since} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
