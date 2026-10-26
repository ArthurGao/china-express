"use client";

import { safeHref } from "@/lib/safe-href";
import { ErrorText, Flash, useFlash } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { JourneyProgress } from "@/components/journey-progress";
import { Money, PriceLines, TotalAmount } from "@/components/money";
import { ReasonDialog } from "@/components/reason-dialog";
import { Timeline } from "@/components/shipments/timeline";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { When } from "@/components/when";
import { $api, errorStatus, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { PriceAdjustmentForm } from "./price-adjustment-form";

type Transition = components["schemas"]["Transition"];

export function OpsShipment({ id }: { id: string }) {
  const t = useTranslations("ops.shipment");
  const ts = useTranslations("status.shipment");
  const tq = useTranslations("quote");
  const queryClient = useQueryClient();
  const options = { params: { path: { shipmentId: id } } };
  const queryKey = $api.queryOptions("get", "/ops/shipments/{shipmentId}", options).queryKey;
  const shipment = $api.useQuery("get", "/ops/shipments/{shipmentId}", options);
  const transition = $api.useMutation("post", "/ops/shipments/{shipmentId}/transition");
  const addNote = $api.useMutation("post", "/ops/shipments/{shipmentId}/notes");
  const setTracking = $api.useMutation("put", "/ops/shipments/{shipmentId}/tracking");
  const flash = useFlash();
  const [note, setNote] = useState("");
  const [tracking, setTrackingText] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState(false);

  if (shipment.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  const s = shipment.data;
  if (!s) return null;
  const trackingUrl = safeHref(s.trackingUrl);

  function move(tr: Transition, reason: string | null) {
    flash.clear();
    transition.mutate({ params: { path: { shipmentId: id }, header: idem() }, body: { to: tr.to, expectedVersion: s!.version, reason } }, {
      onSuccess: (r) => {
        flash.ok(t("moved", { status: ts(r.status) }));
        void queryClient.invalidateQueries({ queryKey });
      },
      onError: (e) => flash.fail(t(errorStatus(e) === 409 ? "conflict" : "failed")),
    });
  }

  function saveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    addNote.mutate({ params: { path: { shipmentId: id } }, body: { text: note.trim() } }, {
      onSuccess: (created) => { queryClient.setQueryData(queryKey, { ...s!, notes: [created, ...s!.notes] }); setNote(""); },
    });
  }

  function saveTracking(e: React.FormEvent) {
    e.preventDefault();
    if (!tracking || !/^https:\/\//.test(tracking)) return flash.fail(t("trackingInvalid"));
    setTracking.mutate({ params: { path: { shipmentId: id } }, body: { trackingUrl: tracking } }, {
      onSuccess: (r) => { queryClient.setQueryData(queryKey, { ...s!, trackingUrl: r.trackingUrl }); setTrackingText(null); },
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="grid content-start gap-6">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-mono text-xl font-semibold">{s.shipmentNo}</h1>
            <StatusBadge group="shipment" value={s.status} />
            <span className="text-muted-foreground">{tq(`products.${s.product}`)} · {tq(`regions.${s.destination.region}`)}</span>
          </div>
          <JourneyProgress step={s.step} exception={s.exception} compact />
        </div>

        <section className="grid gap-2" aria-labelledby="transitions">
          <h2 id="transitions" className="font-semibold">{t("transitions")}</h2>
          {s.allowedTransitions.length === 0 ? <p className="text-muted-foreground">{t("noTransitions")}</p> : (
            <div className="flex flex-wrap gap-2" data-testid="transitions">
              {s.allowedTransitions.map((tr) => {
                const label = t(tr.kind === "ROLLBACK" ? "rollbackTo" : "moveTo", { status: ts(tr.to) });
                return tr.reasonRequired ? (
                  <ReasonDialog key={tr.to} trigger={label} title={label} description={t(tr.kind === "ROLLBACK" ? "rollbackBody" : "reasonBody")}
                    confirmLabel={t("confirm")} destructive={tr.kind === "ROLLBACK"} pending={transition.isPending} onConfirm={(reason) => move(tr, reason)} />
                ) : (
                  <Button key={tr.to} size="sm" onClick={() => move(tr, null)} disabled={transition.isPending}>{label}</Button>
                );
              })}
            </div>
          )}
          <Flash value={flash.flash} />
        </section>

        {s.final && (
          <section className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{t("finalPrice")}</h2>
              {!adjusting && <Button size="sm" variant="outline" onClick={() => setAdjusting(true)}>{t("requestAdjustment")}</Button>}
            </div>
            <PriceLines lines={s.final.lines} />
            {s.final.totals.map((total) => <TotalAmount key={total.currency} total={total} className="font-semibold" />)}
            {adjusting && (
              <PriceAdjustmentForm shipmentId={s.id} lines={s.final.lines}
                onDone={() => { setAdjusting(false); flash.ok(t("adjustmentRequested")); }} />
            )}
          </section>
        )}

        {s.receivable && (
          <section className="grid gap-1">
            <h2 className="font-semibold">{t("receivable")}</h2>
            <p className="flex flex-wrap items-center gap-3">
              <span className="font-mono">{s.receivable.receivableNo}</span>
              <StatusBadge group="receivable" value={s.receivable.status} />
              <span>{t("balance")} <Money amount={s.receivable.balance} currency={s.receivable.currency} /></span>
            </p>
          </section>
        )}

        <section className="grid gap-2">
          <h2 className="font-semibold">{t("timeline")}</h2>
          <Timeline events={s.timeline} />
        </section>
      </div>

      <aside className="grid content-start gap-6">
        <section className="grid gap-1 border border-rule bg-surface p-4">
          <h2 className="font-semibold">{t("customer")}</h2>
          <Link href={`/staff/ops/customers/${s.customer.id}`} className="font-mono underline">{s.customer.memberNo}</Link>
          <span>{s.customer.name}</span>
          {s.customer.email && <span className="text-muted-foreground">{s.customer.email}</span>}
          {s.customer.phone && <span className="tabular text-muted-foreground">{s.customer.phone}</span>}
        </section>

        <section className="grid gap-2">
          <h2 className="font-semibold">{t("tracking")}</h2>
          {trackingUrl && tracking === null && <a href={trackingUrl} target="_blank" rel="noreferrer" className="break-all underline">{s.trackingUrl}</a>}
          {tracking === null ? (
            <Button size="sm" variant="outline" className="justify-self-start" onClick={() => setTrackingText(s.trackingUrl ?? "https://")}>
              {t(s.trackingUrl ? "editTracking" : "addTracking")}
            </Button>
          ) : (
            <form onSubmit={saveTracking} className="flex gap-2">
              <Input aria-label={t("tracking")} value={tracking} onChange={(e) => setTrackingText(e.target.value)} />
              <Button type="submit" size="sm">{t("save")}</Button>
            </form>
          )}
        </section>

        <section className="grid gap-2">
          <h2 className="font-semibold">{t("notes")}</h2>
          <form onSubmit={saveNote} className="grid gap-2">
            <Textarea aria-label={t("newNote")} placeholder={t("newNote")} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button type="submit" size="sm" variant="outline" className="justify-self-start" disabled={!note.trim() || addNote.isPending}>{t("addNote")}</Button>
          </form>
          <ul className="divide-y divide-rule border-y border-rule" data-testid="notes">
            {s.notes.map((n) => (
              <li key={n.id} className="py-2">
                <p>{n.text}</p>
                <p className="text-xs text-muted-foreground">{n.by} · <When iso={n.at} /></p>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}

