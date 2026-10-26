"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { $api, newIdempotencyKey } from "@/lib/api/client";
import type { EstimateRequest, ProductQuote } from "@/lib/api/types";
import { touchLead } from "@/lib/leads";
import { LeadTouch } from "@/components/lead-touch";
import { QuoteForm } from "./quote-form";
import { QuoteNotes } from "./quote-notes";
import { QuoteResults } from "./quote-results";

export function QuotePage() {
  const t = useTranslations("quote");
  const router = useRouter();
  const estimate = $api.useMutation("post", "/quotes/estimate");
  const [selected, setSelected] = useState<ProductQuote["product"] | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  function submit(body: EstimateRequest) {
    setSelected(null);
    estimate.mutate(
      { body, params: { header: { "Idempotency-Key": newIdempotencyKey() } } },
      { onSuccess: () => { void touchLead("QUOTE_CALCULATED"); requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" })); } },
    );
  }

  function next() {
    if (!estimate.data || !selected) return;
    router.push(`/pre-notice/new?quote=${estimate.data.quoteId}&product=${selected}`);
  }

  return (
    <div className="grid gap-10">
      <LeadTouch stage="QUOTE_OPENED" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("intro")}</p>
      </div>
      <QuoteForm onSubmit={submit} submitting={estimate.isPending} />
      {estimate.isError && <p role="alert" className="text-destructive">{t("errors.submit")}</p>}
      <div ref={resultsRef}>
        {estimate.data && <QuoteResults estimate={estimate.data} selected={selected} onSelect={setSelected} onNext={next} />}
      </div>
      <QuoteNotes />
    </div>
  );
}
