"use client";

import { FilterChips, statusQuery } from "@/components/filter-chips";
import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Money } from "@/components/money";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { StatusBadge } from "@/components/status-badge";
import { When } from "@/components/when";
import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

type Status = components["schemas"]["ReceivableStatus"];
const FILTERS: (Status | "all")[] = ["all", "issued", "partially_paid", "paid", "overpaid", "void"];

export function ReceivableList() {
  const t = useTranslations("finance.receivables");
  const ts = useTranslations("status.receivable");
  const [filter, setFilter] = useState<Status | "all">("all");
  const list = $api.useQuery("get", "/finance/receivables", { params: { query: statusQuery(filter) } });
  return (
    <div className="grid gap-3">
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} label={t("filter")}
        renderLabel={(f) => (f === "all" ? t("all") : ts(f))} />
      {list.isError && <ErrorText>{t("loadFailed")}</ErrorText>}
      <table className={DATA_TABLE} data-testid="receivables">
        <thead><tr className={DATA_HEAD_ROW}><th>{t("receivableNo")}</th><th>{t("customer")}</th><th>{t("shipment")}</th><th className="text-right">{t("total")}</th><th className="text-right">{t("balance")}</th><th>{t("status")}</th><th>{t("issued")}</th></tr></thead>
        <tbody>
          {list.data?.map((r) => (
            <tr key={r.id} className={DATA_ROW}>
              <td><Link className="font-mono underline" href={`/staff/finance/receivables/${r.id}`}>{r.receivableNo}</Link></td>
              <td><span className="font-mono">{r.customer.memberNo}</span> {r.customer.name}</td>
              <td className="font-mono">{r.shipmentNo}</td>
              <td className="text-right"><Money amount={r.totalInclGst} currency={r.currency} /></td>
              <td className="text-right font-semibold"><Money amount={r.balance} currency={r.currency} /></td>
              <td><StatusBadge group="receivable" value={r.status} /></td>
              <td><When iso={r.issuedAt} date /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
