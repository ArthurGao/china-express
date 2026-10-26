"use client";

import { ErrorText, Flash, useFlash } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { When } from "@/components/when";
import { addressLine } from "@/components/account/address-fields";
import { $api, idem } from "@/lib/api/client";

const MEMBER_NO = /^CE-\d{6}-\d$/;

/** Customer profile for operations; merging two accounts is an audited ops action (design 06). */
export function OpsCustomer({ id }: { id: string }) {
  const t = useTranslations("ops.customer");
  const ta = useTranslations("account.providers");
  const queryClient = useQueryClient();
  const options = { params: { path: { customerId: id } } };
  const customer = $api.useQuery("get", "/ops/customers/{customerId}", options);
  const merge = $api.useMutation("post", "/ops/customers/{customerId}/merge");
  const [target, setTarget] = useState("");
  const flash = useFlash();

  if (customer.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  const c = customer.data;
  if (!c) return null;
  const targetOk = MEMBER_NO.test(target.trim().toUpperCase()) && target.trim().toUpperCase() !== c.memberNo;

  function doMerge(reason: string) {
    merge.mutate({
      params: { path: { customerId: id }, header: idem() },
      body: { intoMemberNo: target.trim().toUpperCase(), reason },
    }, {
      onSuccess: (u) => {
        queryClient.setQueryData($api.queryOptions("get", "/ops/customers/{customerId}", options).queryKey, u);
        flash.ok(t("merged", { memberNo: u.mergedInto ?? "" }));
      },
      onError: () => flash.fail(t("mergeFailed")),
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="grid content-start gap-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-stencil text-3xl leading-none">{c.memberNo}</h1>
          <span className="text-lg">{c.displayName}</span>
        </div>
        {c.mergedInto && <p role="status" className="font-medium text-warning">{t("mergedInto", { memberNo: c.mergedInto })}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
          <dt className="text-muted-foreground">{t("email")}</dt><dd>{c.email ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("phone")}</dt><dd className="tabular">{c.phone ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("since")}</dt><dd><When iso={c.createdAt} date /></dd>
          <dt className="text-muted-foreground">{t("source")}</dt><dd className="font-mono">{c.source ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("identities")}</dt>
          <dd>{c.identities.map((i) => `${ta(i.provider)} (${i.label})`).join(", ")}</dd>
          <dt className="text-muted-foreground">{t("addresses")}</dt>
          <dd>{c.addresses.map((a) => <div key={a.id}>{a.label}: {addressLine(a.address)}</div>)}</dd>
        </dl>
      </section>
      <section className="grid content-start gap-4">
        <div className="grid gap-1">
          <h2 className="font-semibold">{t("shipments")}</h2>
          <ul className="divide-y divide-rule border-y border-rule">
            {c.shipments.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-1.5">
                <Link href={`/staff/ops/shipments/${s.id}`} className="font-mono underline">{s.shipmentNo}</Link>
                <StatusBadge group="shipment" value={s.status} />
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-1">
          <h2 className="font-semibold">{t("preNotices")}</h2>
          <ul className="divide-y divide-rule border-y border-rule">
            {c.preNotices.map((p) => <li key={p.id} className="flex justify-between py-1.5"><span className="font-mono">{p.reference}</span><When iso={p.createdAt} date /></li>)}
          </ul>
        </div>
        {!c.mergedInto && (
          <div className="grid gap-2 border border-rule p-4">
            <h2 className="font-semibold">{t("mergeTitle")}</h2>
            <p className="text-muted-foreground">{t("mergeBody")}</p>
            <Label htmlFor="merge-target">{t("mergeTarget")}</Label>
            <div className="flex gap-2">
              <Input id="merge-target" className="max-w-48 font-mono" placeholder="CE-000000-0" value={target} onChange={(e) => setTarget(e.target.value)} />
              {targetOk && (
                <ReasonDialog trigger={t("merge")} title={t("mergeConfirmTitle", { from: c.memberNo, to: target.trim().toUpperCase() })}
                  description={t("mergeConfirmBody")} confirmLabel={t("merge")} destructive pending={merge.isPending} onConfirm={doMerge} />
              )}
            </div>
          </div>
        )}
        <Flash value={flash.flash} />
      </section>
    </div>
  );
}
