"use client";

import { useTranslations } from "next-intl";
import type { QuoteLine, Total } from "@/lib/api/types";
import { useLocalized } from "@/lib/i18n-text";
import { formatMoney } from "@/lib/money";

// Display only: every amount here is a string the backend computed.

export function Money({ amount, currency, className }: { amount: string; currency: "NZD" | "USD"; className?: string }) {
  return <span className={`tabular ${className ?? ""}`}>{formatMoney(amount, currency)}</span>;
}

/** A total with "+GST" when the API says GST applies (the GST amount itself is only computed on invoices). */
export function TotalAmount({ total, ...props }: { total: Total } & React.ComponentProps<"span">) {
  const t = useTranslations("common");
  return (
    <span {...props}>
      <Money amount={total.amountExGst} currency={total.currency} />
      {total.gstApplies && <span className="ml-1 text-sm font-normal text-muted-foreground">{t("plusGst")}</span>}
    </span>
  );
}

/** The backend's priced lines, label left and amount right. */
export function PriceLines({ lines }: { lines: QuoteLine[] }) {
  const localized = useLocalized();
  return (
    <dl className="grid gap-1 text-sm">
      {lines.map((line) => (
        <div key={line.code} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{localized(line.label)}</dt>
          <dd><Money amount={line.amount} currency={line.currency} /></dd>
        </div>
      ))}
    </dl>
  );
}
