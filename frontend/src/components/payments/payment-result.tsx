"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Money } from "@/components/money";
import { StatusBadge } from "@/components/status-badge";
import { $api } from "@/lib/api/client";

/**
 * Where the payment gateway sends the customer back (stage 3). Only the gateway callback decides the outcome, so this
 * page shows the server's status and keeps asking while it is still PROCESSING.
 */
export function PaymentResult() {
  const t = useTranslations("payment");
  const paymentId = useSearchParams().get("payment");
  const payment = $api.useQuery("get", "/payments/{paymentId}", { params: { path: { paymentId: paymentId ?? "" } } }, {
    enabled: !!paymentId,
    refetchInterval: (query) => (query.state.data?.status === "PROCESSING" ? 3000 : false),
  });

  if (!paymentId || payment.isError) return <ErrorText>{t("notFound")}</ErrorText>;
  const p = payment.data;
  if (!p) return null;

  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t(`title.${p.status}`)}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge group="onlinePayment" value={p.status} />
        <span className="font-mono">{p.shipmentNo}</span>
        <Money amount={p.amount} currency={p.currency} className="font-semibold" />
      </div>
      <p className="text-muted-foreground">{t(`body.${p.status}`)}</p>
      <Link href={`/shipments/${p.shipmentId}`} className="inline-flex min-h-11 items-center justify-self-start font-medium underline">{t("back")}</Link>
    </div>
  );
}
