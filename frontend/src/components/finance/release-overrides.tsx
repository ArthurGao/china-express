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

type ReleaseOverride = components["schemas"]["ReleaseOverride"];

/** Requests to release before full payment (finance asks, admin decides; design 09). */
export function ReleaseOverrides() {
  const t = useTranslations("finance.overrides");
  const queryClient = useQueryClient();
  const list = $api.useQuery("get", "/finance/release-overrides");
  const approve = $api.useMutation("post", "/finance/release-overrides/{overrideId}/approve");
  const reject = $api.useMutation("post", "/finance/release-overrides/{overrideId}/reject");
  const key = $api.queryOptions("get", "/finance/release-overrides").queryKey;
  const replace = (u: ReleaseOverride) => queryClient.setQueryData(key, upsertById(u));
  const params = (id: string) => ({ path: { overrideId: id }, header: idem() });

  if (list.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  if (list.data?.length === 0) return <p className="text-muted-foreground">{t("empty")}</p>;
  return (
    <table className={DATA_TABLE} data-testid="overrides">
      <thead><tr className={DATA_HEAD_ROW}><th>{t("shipment")}</th><th>{t("receivable")}</th><th className="text-right">{t("balance")}</th><th>{t("reason")}</th><th>{t("requested")}</th><th>{t("status")}</th><th /></tr></thead>
      <tbody>
        {list.data?.map((o) => (
          <tr key={o.id} className={`${DATA_ROW} align-top`}>
            <td><Link href={`/staff/ops/shipments/${o.shipmentId}`} className="font-mono underline">{o.shipmentNo}</Link></td>
            <td className="font-mono">{o.receivableNo}</td>
            <td className="text-right font-semibold"><Money amount={o.balance} currency={o.currency} /></td>
            <td>{o.reason}{o.decisionNote && <div className="text-muted-foreground">{o.decidedBy}: {o.decisionNote}</div>}</td>
            <td>{o.requestedBy}<div className="text-muted-foreground"><When iso={o.requestedAt} /></div></td>
            <td><StatusBadge group="approval" value={o.status} /></td>
            <td className="text-right whitespace-nowrap">
              <ApprovalActions status={o.status} labels={{ approve: t("approve"), reject: t("reject"), rejectTitle: t("rejectTitle", { shipmentNo: o.shipmentNo }) }}
                onApprove={() => approve.mutate({ params: params(o.id), body: { note: null } }, { onSuccess: replace })}
                onReject={(reason) => reject.mutate({ params: params(o.id), body: { reason } }, { onSuccess: replace })} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
