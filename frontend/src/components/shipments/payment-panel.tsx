"use client";

import { safeHref } from "@/lib/safe-href";
import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Money } from "@/components/money";
import { SectionHeading } from "@/components/section-heading";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { When } from "@/components/when";
import { $api, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { hardNavigate } from "@/lib/navigation";

type ShipmentDetail = components["schemas"]["ShipmentDetail"];

/** What is owed and how to pay: bank transfer with the receivable number as reference (stage 2), card / wallet online (stage 3). */
export function PaymentPanel({ shipment, n }: { shipment: ShipmentDetail; n: string }) {
  const t = useTranslations("shipments.payment");
  const pay = $api.useMutation("post", "/shipments/{shipmentId}/payments");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const receivable = shipment.receivable;
  if (!receivable) return null;
  const due = receivable.balance !== "0.00";

  async function copyReference() {
    await navigator.clipboard.writeText(receivable!.bankTransfer.reference);
    setCopied(true);
  }

  function payOnline() {
    setError(false);
    pay.mutate(
      { params: { path: { shipmentId: shipment.id }, header: idem() } },
      // The gateway's page; the result page waits for the gateway callback rather than trusting the redirect.
      {
        onSuccess: (session) => {
          const target = safeHref(session.redirectUrl);
          if (target) hardNavigate(target);
          else setError(true);
        },
        onError: () => setError(true),
      },
    );
  }

  return (
    <section className="grid gap-4 border border-rule bg-surface p-4" aria-labelledby="payment-title" data-testid="payment-panel">
      <SectionHeading id="payment-title" n={n} title={t("title")} />
      <StatusBadge group="receivable" value={receivable.status} className="justify-self-start" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{t("receivableNo")}</dt><dd className="font-mono">{receivable.receivableNo}</dd>
        <dt className="text-muted-foreground">{t("total")}</dt><dd><Money amount={receivable.totalInclGst} currency={receivable.currency} /></dd>
        <dt className="text-muted-foreground">{t("paid")}</dt><dd><Money amount={receivable.paid} currency={receivable.currency} /></dd>
        <dt className="font-medium">{t("balance")}</dt>
        <dd className="text-lg font-semibold" data-testid="balance"><Money amount={receivable.balance} currency={receivable.currency} /></dd>
      </dl>

      {due && (
        <div className="grid gap-2 border-t border-rule pt-4">
          <h3 className="font-semibold">{t("bankTitle")}</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{t("accountName")}</dt><dd>{receivable.bankTransfer.accountName}</dd>
            <dt className="text-muted-foreground">{t("accountNumber")}</dt><dd className="font-mono">{receivable.bankTransfer.accountNumber}</dd>
            <dt className="text-muted-foreground">{t("reference")}</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono font-semibold" data-testid="bank-reference">{receivable.bankTransfer.reference}</span>
              <Button size="sm" variant="outline" onClick={copyReference}>{copied ? t("copied") : t("copy")}</Button>
            </dd>
          </dl>
          {receivable.bankTransfer.isPlaceholder && <p className="text-sm text-warning">{t("placeholder")}</p>}
          <p className="text-sm text-muted-foreground">{t("bankNote")}</p>
        </div>
      )}

      {due && shipment.onlinePaymentAvailable && shipment.actions.includes("PAY") && (
        <div className="grid gap-2 border-t border-rule pt-4">
          <Button className="h-12 justify-self-start" onClick={payOnline} disabled={pay.isPending}>{t("payOnline")}</Button>
          <p className="text-sm text-muted-foreground">{t("payOnlineNote")}</p>
          {error && <ErrorText>{t("payFailed")}</ErrorText>}
        </div>
      )}

      {receivable.invoices.length > 0 && (
        <div className="grid gap-2 border-t border-rule pt-4">
          <h3 className="font-semibold">{t("invoices")}</h3>
          <ul className="grid gap-1 text-sm">
            {receivable.invoices.map((inv) => (
              <li key={inv.invoiceNo} className="flex flex-wrap items-baseline gap-3">
                <a href={safeHref(inv.pdfUrl) ?? undefined} target="_blank" rel="noreferrer" className="font-mono underline">{inv.invoiceNo}</a>
                <span className="text-muted-foreground">{t(`invoiceKinds.${inv.kind}`)} · <When iso={inv.issuedAt} date /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
