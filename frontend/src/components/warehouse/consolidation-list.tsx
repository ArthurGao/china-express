"use client";

import { FilterChips, statusQuery } from "@/components/filter-chips";
import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { DATA_HEAD_ROW, DATA_TABLE, ROW_LINK, WH_ROW } from "@/components/rates/data-table";
import { StatusBadge } from "@/components/status-badge";
import { When } from "@/components/when";
import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

type Status = components["schemas"]["ConsolidationStatus"];
const FILTERS: (Status | "all")[] = ["all", "requested", "in_progress", "completed"];

export function ConsolidationList() {
  const t = useTranslations("warehouse.consolidations");
  const ts = useTranslations("status.consolidation");
  const tq = useTranslations("quote");
  const th = useTranslations("shipments.handling.modes");
  const [filter, setFilter] = useState<Status | "all">("all");
  const list = $api.useQuery("get", "/wh/consolidations", { params: { query: statusQuery(filter) } });
  return (
    <div className="grid gap-3">
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} label={t("filter")} large
        renderLabel={(f) => (f === "all" ? t("all") : ts(f))} />
      {list.isError && <ErrorText>{t("loadFailed")}</ErrorText>}
      <table className={DATA_TABLE} data-testid="consolidations">
        <thead><tr className={DATA_HEAD_ROW}><th>{t("reference")}</th><th>{t("member")}</th><th>{t("mode")}</th><th className="text-right">{t("parcels")}</th><th>{t("status")}</th><th>{t("requested")}</th></tr></thead>
        <tbody>
          {list.data?.map((c) => (
            <tr key={c.id} className={WH_ROW}>
              <td><Link className={ROW_LINK} href={`/staff/warehouse/consolidations/${c.id}`}>{c.reference}</Link></td>
              <td className="font-mono">{c.memberNo}</td>
              <td>{th(`${c.mode}.name`)} · {tq(`products.${c.product}`)}</td>
              <td className="tabular text-right">{c.parcelCount}</td>
              <td><StatusBadge group="consolidation" value={c.status} /></td>
              <td><When iso={c.requestedAt} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
