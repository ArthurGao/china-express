"use client";

import { ErrorText } from "@/components/feedback";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Money, PriceLines, TotalAmount } from "@/components/money";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { $api, idem } from "@/lib/api/client";
import type { FclEstimate as FclEstimateResult, FclPorts } from "@/lib/api/types";

type Size = "20" | "40";
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

function PortSelect({ id, label, ports, value, onChange, grouped }: {
  id: string; label: string; ports: FclPorts["origins"]; value: string; onChange: (v: string) => void; grouped?: boolean;
}) {
  const t = useTranslations("fcl");
  const option = (p: FclPorts["origins"][number]) => <option key={p.code} value={p.code}>{p.name}</option>;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-12 border border-input bg-surface px-3">
        <option value="">{t("choose")}</option>
        {grouped ? (
          <>
            <optgroup label={t("commonPorts")}>{ports.filter((p) => p.group === "COMMON").map(option)}</optgroup>
            <optgroup label={t("otherPorts")}>{ports.filter((p) => p.group !== "COMMON").map(option)}</optgroup>
          </>
        ) : ports.map(option)}
      </select>
    </div>
  );
}

export function FclEstimate() {
  const t = useTranslations("fcl");
  const tq = useTranslations("quote.results");
  const format = useFormatter();
  const ports = $api.useQuery("get", "/fcl/ports", {}, { staleTime: 60 * 60_000 });
  const estimate = $api.useMutation("post", "/quotes/fcl");
  const [size, setSize] = useState<Size | "">("");
  const [origin, setOrigin] = useState("");
  const [dest, setDest] = useState("");
  const [missing, setMissing] = useState(false);

  function request(includeLocalCharges: boolean) {
    if (!size || !origin || !dest) return setMissing(true);
    setMissing(false);
    estimate.mutate({
      body: { size, originPort: origin, destPort: dest, includeLocalCharges },
      params: { header: idem() },
    });
  }

  const result: FclEstimateResult | undefined = estimate.data;
  const partA = result?.lines.filter((l) => l.group === "OCEAN") ?? [];
  const partB = result?.lines.filter((l) => l.group !== "OCEAN") ?? [];
  const totalA = result?.totals.find((x) => x.currency === "USD");
  const totalB = result?.totals.find((x) => x.currency === "NZD");
  const showB = partB.length > 0 && !!totalB;
  const portNames = useMemo(
    () => new Map([...(ports.data?.origins ?? []), ...(ports.data?.destinations ?? [])].map((p) => [p.code, p.name])),
    [ports.data],
  );
  const dateOf = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });

  // Built from the request that produced the estimate, so later edits to the form cannot change the message.
  const sent = estimate.variables?.body;
  const whatsappHref = result && sent && WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t("whatsappText", {
        size: t(`sizes.${sent.size}`), origin: portNames.get(sent.originPort) ?? sent.originPort,
        dest: portNames.get(sent.destPort) ?? sent.destPort, ref: result.quoteId.slice(0, 8),
      }))}`
    : null;

  return (
    <div className="grid gap-8">
      <div>
        <Link href="/quote" className="text-sm text-primary hover:underline">{t("back")}</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("intro")}</p>
      </div>

      {ports.data?.rateSheet.expired && (
        <p role="status" className="border border-rule border-t-2 border-t-warning bg-surface p-3 text-sm">
          {t("rateSheetExpired", { date: dateOf(ports.data.rateSheet.validTo) })}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="fcl-size">{t("size")}</Label>
          <select id="fcl-size" value={size} onChange={(e) => setSize(e.target.value as Size | "")} className="h-12 border border-input bg-surface px-3">
            <option value="">{t("choose")}</option>
            <option value="20">{t("sizes.20")}</option>
            <option value="40">{t("sizes.40")}</option>
          </select>
        </div>
        <PortSelect id="fcl-origin" label={t("origin")} ports={ports.data?.origins ?? []} value={origin} onChange={setOrigin} grouped />
        <PortSelect id="fcl-dest" label={t("dest")} ports={ports.data?.destinations ?? []} value={dest} onChange={setDest} />
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="button" size="lg" className="h-12" onClick={() => request(false)} disabled={estimate.isPending}>{t("getA")}</Button>
        <Button type="button" size="lg" variant="outline" className="h-12" onClick={() => request(true)} disabled={estimate.isPending}>{t("addB")}</Button>
      </div>
      {missing && <p className="text-sm text-destructive">{t("errors.required")}</p>}
      {estimate.isError && <ErrorText>{t("errors.submit")}</ErrorText>}

      {result && result.status === "REQUIRES_REVIEW" && (
        <section className="grid gap-2 border border-rule bg-surface p-4" data-testid="fcl-review">
          <p className="text-xs font-semibold tracking-wide text-warning uppercase">{tq("level.review")}</p>
          {result.reviewReasons.map((r) => <p key={r}>{tq(`reasons.${r}`)}</p>)}
        </section>
      )}

      {result && result.status === "OK" && (
        <section className="grid gap-6 md:grid-cols-2" data-testid="fcl-result">
          <div className="grid content-start gap-3 border border-rule bg-surface p-4">
            <h2 className="font-semibold">{t("partA")}</h2>
            <p className="text-sm text-muted-foreground">{t("partANote")}</p>
            <PriceLines lines={partA} />
            {totalA && (
              <div className="flex justify-between border-t border-rule pt-3 font-semibold">
                <span>{t("subtotal")}</span><Money amount={totalA.amountExGst} currency="USD" />
              </div>
            )}
          </div>
          {showB && totalB && (
            <div className="grid content-start gap-3 border border-rule bg-surface p-4">
              <h2 className="font-semibold">{t("partB")}</h2>
              <p className="text-sm text-muted-foreground">{t("partBNote")}</p>
              {(["PORT", "DELIVERY"] as const).map((g) => (
                <div key={g} className="grid gap-1">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t(`groups.${g}`)}</h3>
                  <PriceLines lines={partB.filter((l) => l.group === g)} />
                </div>
              ))}
              <div className="flex justify-between border-t border-rule pt-3 font-semibold">
                <span>{t("subtotal")}</span>
                <TotalAmount total={totalB} />
              </div>
            </div>
          )}
          <div className="grid gap-2 border-t-2 border-foreground pt-4 md:col-span-2">
            <h2 className="font-semibold">{t("summary")}</h2>
            <p className="text-xl font-semibold" data-testid="fcl-summary">
              {totalA && <Money amount={totalA.amountExGst} currency="USD" />}
              {showB && totalB && <> + <TotalAmount total={totalB} /></>}
            </p>
            <p className="text-sm text-muted-foreground">{t("summaryNote")}</p>
            <p className="text-sm font-medium">{t("validity", { date: dateOf(result.expiresAt) })}</p>
          </div>
        </section>
      )}

      {whatsappHref && (
        <Button asChild size="lg" className="h-12 justify-self-start">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">{t("whatsapp")}</a>
        </Button>
      )}

      <aside className="grid gap-3 border-t border-rule pt-6 text-sm">
        <h2 className="font-semibold">{t("conditions.title")}</h2>
        <ul className="list-disc pl-5">
          {(["distance", "site", "tariff", "weight"] as const).map((k) => <li key={k}>{t(`conditions.items.${k}`)}</li>)}
        </ul>
        <p>{t("excluded")}</p>
        <p className="text-muted-foreground">{t("disclaimer")}</p>
      </aside>
    </div>
  );
}
