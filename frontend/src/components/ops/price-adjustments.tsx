"use client";

import { ApprovalActions } from "@/components/approval-actions";
import { upsertById } from "@/lib/api/cache";
import { ErrorText } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Money } from "@/components/money";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { StatusBadge } from "@/components/status-badge";
import { When } from "@/components/when";
import { $api, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { useLocalized } from "@/lib/i18n-text";

type PriceAdjustment = components["schemas"]["PriceAdjustment"];

/** Adjustment requests; only admins see approve / reject (the backend enforces it too). */
export function PriceAdjustments() {
  const t = useTranslations("ops.adjustments");
  const localized = useLocalized();
  const queryClient = useQueryClient();
  const list = $api.useQuery("get", "/ops/price-adjustments");
  const approve = $api.useMutation("post", "/ops/price-adjustments/{adjustmentId}/approve");
  const reject = $api.useMutation("post", "/ops/price-adjustments/{adjustmentId}/reject");
  const key = $api.queryOptions("get", "/ops/price-adjustments").queryKey;
  const replace = (u: PriceAdjustment) => queryClient.setQueryData(key, upsertById(u));
  const params = (id: string) => ({ path: { adjustmentId: id }, header: idem() });

  if (list.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  return (
    <table className={DATA_TABLE} data-testid="adjustments">
      <thead><tr className={DATA_HEAD_ROW}><th>{t("shipment")}</th><th>{t("changes")}</th><th>{t("reason")}</th><th>{t("requested")}</th><th>{t("status")}</th><th /></tr></thead>
      <tbody>
        {list.data?.map((a) => (
          <tr key={a.id} className={`${DATA_ROW} align-top`}>
            <td><Link href={`/staff/ops/shipments/${a.shipmentId}`} className="font-mono underline">{a.shipmentNo}</Link></td>
            <td>
              {a.lines.map((l) => (
                <div key={l.code}>{localized(l.label)}: <Money amount={l.before} currency="NZD" /> → <Money amount={l.after} currency="NZD" className="font-semibold" /></div>
              ))}
            </td>
            <td>{a.reason}{a.decisionNote && <div className="text-muted-foreground">{a.decidedBy}: {a.decisionNote}</div>}</td>
            <td>{a.requestedBy}<div className="text-muted-foreground"><When iso={a.requestedAt} /></div></td>
            <td><StatusBadge group="approval" value={a.status} /></td>
            <td className="text-right whitespace-nowrap">
              <ApprovalActions status={a.status} labels={{ approve: t("approve"), reject: t("reject"), rejectTitle: t("rejectTitle", { shipmentNo: a.shipmentNo }) }}
                onApprove={() => approve.mutate({ params: params(a.id), body: { note: null } }, { onSuccess: replace })}
                onReject={(reason) => reject.mutate({ params: params(a.id), body: { reason } }, { onSuccess: replace })} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
