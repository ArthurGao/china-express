"use client";

import { useTranslations } from "next-intl";
import { PriceLines, TotalAmount } from "@/components/money";
import { SectionHeading } from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import type { Estimate, ProductQuote } from "@/lib/api/types";

// Renders exactly what the backend returned: its lines, totals, status and reasons. Nothing is computed here.
function OptionCard({ option, selected, onSelect }: { option: ProductQuote; selected: boolean; onSelect: () => void }) {
  const t = useTranslations("quote");
  const selectable = option.status === "OK";
  const level = option.status === "OK" ? "auto" : option.status === "REQUIRES_REVIEW" ? "review" : "unavailable";

  return (
    <article
      data-testid={`option-${option.product}`}
      aria-current={selected ? "true" : undefined}
      className={`flex flex-col border bg-surface ${selected ? "border-primary ring-2 ring-primary" : "border-rule"}`}
    >
      <header className="border-b border-rule p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold">{t(`products.${option.product}`)}</h3>
          <div className="flex gap-2">
            {option.tags.map((tag) => <span key={tag} className="text-sm font-semibold text-primary">{t(`results.tags.${tag}`)}</span>)}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t(`productNotes.${option.product}`)}</p>
        <p className={`mt-2 text-sm ${level === "review" ? "font-medium text-warning" : "text-muted-foreground"}`}>
          {t(`results.level.${level}`)}
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {option.lines.length > 0 && <PriceLines lines={option.lines} />}
        {option.totals.map((total) => (
          <div key={total.currency} className="flex items-baseline justify-between border-t border-rule pt-3">
            <span className="text-sm font-medium">{t("results.total")}</span>
            <TotalAmount total={total} className="text-xl font-semibold" data-testid={`total-${option.product}-${total.currency}`} />
          </div>
        ))}
        {option.reviewReasons.map((reason) => (
          <p key={reason} className="text-sm">{t(`results.reasons.${reason}`)}</p>
        ))}
        <div className="mt-auto pt-2">
          {selectable && (
            <Button type="button" variant={selected ? "default" : "outline"} className="h-11 w-full" aria-pressed={selected} onClick={onSelect}>
              {selected ? t("results.chosen") : t("results.choose")}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function QuoteResults({ estimate, selected, onSelect, onNext }: {
  estimate: Estimate;
  selected: ProductQuote["product"] | null;
  onSelect: (product: ProductQuote["product"]) => void;
  onNext: () => void;
}) {
  const t = useTranslations("quote.results");
  return (
    <section className="grid gap-4">
      <SectionHeading n="03" title={t("title")} />
      <div className="grid gap-4 md:grid-cols-3">
        {estimate.options.map((o) => (
          <OptionCard key={o.product} option={o} selected={selected === o.product} onSelect={() => onSelect(o.product)} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" size="lg" className="h-12 px-8 text-base disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100" disabled={!selected} onClick={onNext}>{t("next")}</Button>
        {!selected && <span className="text-sm text-muted-foreground">{t("pickOne")}</span>}
      </div>
    </section>
  );
}
