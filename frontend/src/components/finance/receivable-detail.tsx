"use client";

import { ErrorText, Flash, useFlash } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { addressLine } from "@/components/account/address-fields";
import { Money } from "@/components/money";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { ReasonDialog } from "@/components/reason-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { When } from "@/components/when";
import { $api, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { useLocalized } from "@/lib/i18n-text";

type FinReceivable = components["schemas"]["FinReceivable"];

/**
 * A receivable as issued (lines and tax from the final-price snapshot, T2.15/T2.16). Invoices are never edited: a mistake
 * is voided and reissued, or credited. Releasing before full payment needs an admin-approved override.
 */
export function ReceivableDetail({ id }: { id: string }) {
  const t = useTranslations("finance.receivable");
  const localized = useLocalized();
  const queryClient = useQueryClient();
  const options = { params: { path: { receivableId: id } } };
  const receivable = $api.useQuery("get", "/finance/receivables/{receivableId}", options);
  const issue = $api.useMutation("post", "/finance/receivables/{receivableId}/invoice");
  const reissue = $api.useMutation("post", "/finance/invoices/{invoiceId}/void-and-reissue");
  const credit = $api.useMutation("post", "/finance/invoices/{invoiceId}/credit-note");
  const override = $api.useMutation("post", "/finance/shipments/{shipmentId}/release-override");
  const flash = useFlash();

  if (receivable.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  const r = receivable.data;
  if (!r) return null;
  const store = (u: FinReceivable) => queryClient.setQueryData($api.queryOptions("get", "/finance/receivables/{receivableId}", options).queryKey, u);
  const fail = () => flash.fail(t("failed"));
  const hasLiveInvoice = r.invoices.some((i) => i.kind === "tax_invoice" && i.status === "issued");
  const unpaid = r.balance !== "0.00" && r.status !== "void";

  return (
    <div className="grid gap-6">
      <Link href="/staff/finance" className="text-muted-foreground hover:underline">← {t("back")}</Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-mono text-xl font-semibold">{r.receivableNo}</h1>
        <StatusBadge group="receivable" value={r.status} />
        <span><span className="font-mono">{r.customer.memberNo}</span> {r.customer.name}</span>
        <Link href={`/staff/ops/shipments/${r.shipmentId}`} className="font-mono underline">{r.shipmentNo}</Link>
        <StatusBadge group="shipment" value={r.shipmentStatus} />
      </div>

      <section className="grid gap-1">
        <h2 className="font-semibold">{t("billTo")}</h2>
        <p>{r.billingEntity.legalName}{r.billingEntity.gstNumber && ` · GST ${r.billingEntity.gstNumber}`}</p>
        <p className="text-muted-foreground">{addressLine(r.billingEntity.address)}</p>
      </section>

      <table className={DATA_TABLE} data-testid="receivable-lines">
        <thead><tr className={DATA_HEAD_ROW}><th>{t("line")}</th><th className="text-right">{t("exTax")}</th><th>{t("taxCode")}</th><th className="text-right">{t("taxRate")}</th><th className="text-right">{t("tax")}</th></tr></thead>
        <tbody>
          {r.lines.map((l) => (
            <tr key={l.code} className={DATA_ROW}>
              <td>{localized(l.description)}</td>
              <td className="text-right"><Money amount={l.amountExTax} currency={r.currency} /></td>
              <td className="font-mono">{l.taxCode}</td>
              <td className="tabular text-right">{l.taxRate}</td>
              <td className="text-right"><Money amount={l.taxAmount} currency={r.currency} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td className="text-right" colSpan={4}>{t("subtotal")}</td><td className="text-right"><Money amount={r.totals.exTax} currency={r.currency} /></td></tr>
          <tr><td className="text-right" colSpan={4}>{t("gst")}</td><td className="text-right"><Money amount={r.totals.tax} currency={r.currency} /></td></tr>
          <tr className="font-semibold"><td className="text-right" colSpan={4}>{t("total")}</td><td className="text-right"><Money amount={r.totals.inclTax} currency={r.currency} /></td></tr>
          <tr><td className="text-right" colSpan={4}>{t("paid")}</td><td className="text-right"><Money amount={r.paid} currency={r.currency} /></td></tr>
          <tr className="font-semibold"><td className="text-right" colSpan={4}>{t("balance")}</td><td className="text-right" data-testid="receivable-balance"><Money amount={r.balance} currency={r.currency} /></td></tr>
        </tfoot>
      </table>
      <p className="text-xs text-muted-foreground">{t("taxProvisional")}</p>

      <section className="grid gap-2">
        <h2 className="font-semibold">{t("allocations")}</h2>
        {r.allocations.length === 0 ? <p className="text-muted-foreground">{t("noAllocations")}</p> : (
          <ul className="divide-y divide-rule border-y border-rule">
            {r.allocations.map((a) => (
              <li key={a.paymentId} className="flex justify-between gap-2 py-1.5">
                <span className="font-mono">{a.paymentNo}</span><span><When iso={a.at} date /></span><Money amount={a.amount} currency={r.currency} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{t("invoices")}</h2>
          {!hasLiveInvoice && r.status !== "void" && (
            <Button size="sm" disabled={issue.isPending}
              onClick={() => issue.mutate({ params: { path: { receivableId: id }, header: idem() } }, { onSuccess: store, onError: fail })}>
              {t("issueInvoice")}
            </Button>
          )}
        </div>
        <ul className="divide-y divide-rule border-y border-rule" data-testid="invoices">
          {r.invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-3 py-2">
              <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className={`font-mono underline ${inv.status === "void" ? "line-through" : ""}`}>{inv.invoiceNo}</a>
              <span className="text-muted-foreground">{t(`kinds.${inv.kind}`)}{inv.status === "void" && ` · ${t("void")}`}{inv.replacesInvoiceNo && ` · ${t("replaces", { invoiceNo: inv.replacesInvoiceNo })}`}</span>
              <When iso={inv.issuedAt} date />
              {inv.kind === "tax_invoice" && inv.status === "issued" && (
                <span className="ml-auto flex gap-1">
                  <ReasonDialog trigger={t("reissue")} title={t("reissueTitle", { invoiceNo: inv.invoiceNo })} description={t("reissueBody")}
                    confirmLabel={t("reissue")} destructive pending={reissue.isPending}
                    onConfirm={(reason) => reissue.mutate({ params: { path: { invoiceId: inv.id }, header: idem() }, body: { reason } }, { onSuccess: store, onError: fail })} />
                  <ReasonDialog trigger={t("creditNote")} title={t("creditTitle", { invoiceNo: inv.invoiceNo })} description={t("creditBody")}
                    confirmLabel={t("creditNote")} destructive pending={credit.isPending}
                    onConfirm={(reason) => credit.mutate({ params: { path: { invoiceId: inv.id }, header: idem() }, body: { reason } }, { onSuccess: store, onError: fail })} />
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {unpaid && r.shipmentStatus === "awaiting_payment" && (
        <section className="grid gap-2 border border-rule p-4">
          <h2 className="font-semibold">{t("overrideTitle")}</h2>
          {r.releaseOverride ? (
            <p className="flex flex-wrap items-center gap-2">
              <StatusBadge group="approval" value={r.releaseOverride.status} />
              {r.releaseOverride.reason} · {r.releaseOverride.requestedBy}
            </p>
          ) : (
            <ReasonDialog trigger={t("requestOverride")} title={t("overrideTitle")} description={t("overrideBody")} confirmLabel={t("requestOverride")}
              pending={override.isPending}
              onConfirm={(reason) => override.mutate({ params: { path: { shipmentId: r.shipmentId }, header: idem() }, body: { reason } }, {
                onSuccess: (o) => { store({ ...r, releaseOverride: o }); flash.ok(t("overrideRequested")); },
                onError: fail,
              })} />
          )}
        </section>
      )}
      <Flash value={flash.flash} />
    </div>
  );
}
