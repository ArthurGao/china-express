"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { $api, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { useLocalized } from "@/lib/i18n-text";
import { toMoneyString } from "@/lib/money";

type QuoteLine = components["schemas"]["QuoteLine"];

/**
 * Request new amounts for priced lines (T2.8). Staff type the new line amounts; nothing is added up here — the backend
 * re-prices the totals once an admin approves, and the customer confirms again.
 */
export function PriceAdjustmentForm({ shipmentId, lines, onDone }: { shipmentId: string; lines: QuoteLine[]; onDone: () => void }) {
  const t = useTranslations("ops.adjust");
  const localized = useLocalized();
  const request = $api.useMutation("post", "/ops/price-adjustments");
  const [amounts, setAmounts] = useState<Record<string, string>>(() => Object.fromEntries(lines.map((l) => [l.code, l.amount])));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = lines.map((l) => ({ code: l.code, before: l.amount, after: toMoneyString(amounts[l.code] ?? "") }));
    if (parsed.some((p) => p.after === null)) return setError(t("badAmount"));
    const changed = parsed.filter((p) => p.after !== p.before).map((p) => ({ code: p.code, after: p.after! }));
    if (changed.length === 0) return setError(t("nothingChanged"));
    if (reason.trim().length < 3) return setError(t("needReason"));
    setError(null);
    request.mutate({ params: { header: idem() }, body: { shipmentId, reason: reason.trim(), lines: changed } }, {
      onSuccess: onDone,
      onError: () => setError(t("failed")),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 border border-rule bg-surface p-4" noValidate data-testid="adjust-form">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-muted-foreground"><th className="py-1">{t("line")}</th><th>{t("current")}</th><th>{t("new")}</th></tr></thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.code}>
              <td className="py-1">{localized(l.label)}</td>
              <td><Money amount={l.amount} currency={l.currency} /></td>
              <td><Input aria-label={t("newFor", { line: localized(l.label) })} inputMode="decimal" className="tabular h-8 w-28"
                value={amounts[l.code] ?? ""} onChange={(e) => setAmounts({ ...amounts, [l.code]: e.target.value })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Label htmlFor="adjust-reason">{t("reason")}</Label>
      <Textarea id="adjust-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      <p className="text-sm text-muted-foreground">{t("note")}</p>
      <ErrorText className="text-sm">{error}</ErrorText>
      <Button type="submit" className="justify-self-start" disabled={request.isPending}>{t("submit")}</Button>
    </form>
  );
}
