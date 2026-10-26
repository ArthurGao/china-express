"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TotalAmount } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { $api, newIdempotencyKey } from "@/lib/api/client";
import type { Product } from "@/lib/api/types";
import { touchLead } from "@/lib/leads";
import { parseTrackingLines } from "@/lib/tracking";
import { QUANTITY } from "@/lib/validation";
import { ProhibitedGoodsList } from "./prohibited-goods";

export function PreNoticeForm({ quoteId, product }: { quoteId: string | null; product: Product | null }) {
  const t = useTranslations("preNotice");
  const tq = useTranslations("quote");
  const router = useRouter();
  const quote = $api.useQuery("get", "/quotes/{quoteId}", { params: { path: { quoteId: quoteId ?? "" } } }, { enabled: !!quoteId });
  const create = $api.useMutation("post", "/pre-notices");
  // One key per form instance: a double submit or a retry after a network drop cannot create two notices.
  const [idempotencyKey] = useState(newIdempotencyKey);
  const [ack, setAck] = useState(false);
  const [expected, setExpected] = useState("");
  const [tracking, setTracking] = useState("");
  const [errors, setErrors] = useState<{ ack?: boolean; tracking?: boolean; expected?: boolean }>({});

  if (!quoteId || !product) {
    return (
      <div className="grid gap-4">
        <p>{t("new.noQuote")}</p>
        <Button asChild className="h-11 justify-self-start"><Link href="/quote">{t("new.toQuote")}</Link></Button>
      </div>
    );
  }

  const option = quote.data?.options.find((o) => o.product === product);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trackingNumbers = parseTrackingLines(tracking);
    const expectedOk = expected === "" || QUANTITY.test(expected);
    const next = { ack: !ack, tracking: trackingNumbers === null, expected: !expectedOk };
    setErrors(next);
    if (next.ack || next.tracking || next.expected || !quote.data || !product) return;
    create.mutate(
      {
        params: { header: { "Idempotency-Key": idempotencyKey } },
        body: {
          estimateQuoteId: quote.data.quoteId,
          product,
          destination: quote.data.input.destination,
          ...(expected ? { expectedParcels: Number.parseInt(expected, 10) } : {}),
          prohibitedGoodsAck: true,
          trackingNumbers: trackingNumbers ?? [],
        },
      },
      {
        onSuccess: (notice) => {
          void touchLead("PRE_NOTICE_SENT");
          router.push(`/pre-notice/${notice.id}`);
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      {option && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 border border-rule bg-surface p-4">
          <div>
            <p className="text-sm text-muted-foreground">{t("new.chosen")}</p>
            <p className="text-lg font-semibold">{tq(`products.${product}`)}</p>
          </div>
          {option.totals.map((total) => (
            <p key={total.currency} className="text-lg font-semibold">
              <span className="mr-2 text-sm font-normal text-muted-foreground">{t("new.estimate")}</span>
              <TotalAmount total={total} />
            </p>
          ))}
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="expected">{t("new.expected")}</Label>
        <Input id="expected" inputMode="numeric" className="h-12 w-28" value={expected} onChange={(e) => setExpected(e.target.value)}
          aria-invalid={errors.expected} />
        {errors.expected && <p className="text-sm text-destructive">{tq("errors.qty")}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tracking">{t("new.trackingLabel")}</Label>
        <Textarea id="tracking" rows={3} className="font-mono" value={tracking} onChange={(e) => setTracking(e.target.value)}
          aria-invalid={errors.tracking} />
        <p className="text-sm text-muted-foreground">{t("new.trackingHint")}</p>
        {errors.tracking && <p className="text-sm text-destructive">{t("tracking.invalid")}</p>}
      </div>

      <ProhibitedGoodsList />
      <div className="grid gap-2">
        <div className="flex items-start gap-3">
          <Checkbox id="ack" checked={ack} onCheckedChange={(v) => setAck(v === true)} className="mt-0.5 size-5" aria-invalid={errors.ack} />
          <Label htmlFor="ack" className="leading-snug font-normal">{t("prohibited.ack")}</Label>
        </div>
        {errors.ack && <p className="text-sm text-destructive">{t("prohibited.ackRequired")}</p>}
      </div>

      <Button type="submit" size="lg" className="h-12 justify-self-start px-8 text-base" disabled={create.isPending || !quote.data}>
        {t("new.submit")}
      </Button>
      {create.isError && <ErrorText>{t("errors.submit")}</ErrorText>}
    </form>
  );
}
