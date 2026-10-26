"use client";

import { FilterChips, statusQuery } from "@/components/filter-chips";
import { upsertById } from "@/lib/api/cache";
import { ErrorText } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { When } from "@/components/when";
import { $api, idem } from "@/lib/api/client";

const FILTERS = ["all", "failed", "queued", "sent"] as const;
type Filter = (typeof FILTERS)[number];

/** Outgoing notifications (design 08): failures are red and can be sent again. */
export function DeliveryLog() {
  const t = useTranslations("ops.deliveries");
  const ts = useTranslations("status.delivery");
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const options = { params: { query: statusQuery(filter) } };
  const list = $api.useQuery("get", "/ops/notification-deliveries", options);
  const resend = $api.useMutation("post", "/ops/notification-deliveries/{deliveryId}/resend");
  const key = $api.queryOptions("get", "/ops/notification-deliveries", options).queryKey;

  return (
    <div className="grid gap-3">
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} label={t("filter")}
        renderLabel={(f) => (f === "all" ? t("all") : ts(f))} />
      {list.isError && <ErrorText>{t("loadFailed")}</ErrorText>}
      <table className={DATA_TABLE} data-testid="deliveries">
        <thead><tr className={DATA_HEAD_ROW}><th>{t("event")}</th><th>{t("reference")}</th><th>{t("channel")}</th><th>{t("recipient")}</th><th>{t("status")}</th><th className="text-right">{t("attempts")}</th><th>{t("at")}</th><th /></tr></thead>
        <tbody>
          {list.data?.map((d) => (
            <tr key={d.id} className={DATA_ROW}>
              <td className="font-mono text-xs">{d.event}</td>
              <td className="font-mono">{d.reference}</td>
              <td>{t(`channels.${d.channel}`)}</td>
              <td className="tabular">{d.recipient}</td>
              <td><StatusBadge group="delivery" value={d.status} />{d.lastError && <div className="text-xs text-destructive">{d.lastError}</div>}</td>
              <td className="tabular text-right">{d.attempts}</td>
              <td><When iso={d.createdAt} /></td>
              <td className="text-right">
                {d.status === "failed" && (
                  <Button size="sm" variant="outline" disabled={resend.isPending}
                    onClick={() => resend.mutate({ params: { path: { deliveryId: d.id }, header: idem() } }, {
                      onSuccess: (u) => queryClient.setQueryData(key, upsertById(u)),
                    })}>{t("resend")}</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
