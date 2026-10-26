"use client";

import { safeHref } from "@/lib/safe-href";
import { upsertById } from "@/lib/api/cache";
import { ErrorText } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Money } from "@/components/money";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { ReasonDialog } from "@/components/reason-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { $api, idem, newIdempotencyKey } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { uploadFile } from "@/lib/files";
import { toMoneyString } from "@/lib/money";

type Payment = components["schemas"]["Payment"];
type Currency = components["schemas"]["Currency"];
type Method = components["schemas"]["PaymentCreate"]["method"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Manual payments (T2.15): record exactly what the bank statement shows, allocate it to receivables, reverse a wrong
 * entry (a new reversal, the original is kept) or record money actually paid back. The backend checks every amount.
 */
export function Payments() {
  const t = useTranslations("finance.payments");
  const queryClient = useQueryClient();
  const list = $api.useQuery("get", "/finance/payments");
  const reverse = $api.useMutation("post", "/finance/payments/{paymentId}/reverse");
  const key = $api.queryOptions("get", "/finance/payments").queryKey;
  const replace = (u: Payment) => queryClient.setQueryData(key, upsertById(u, "start"));

  return (
    <div className="grid gap-6">
      <RecordPayment onRecorded={replace} />
      {list.isError && <ErrorText>{t("loadFailed")}</ErrorText>}
      <table className={DATA_TABLE} data-testid="payments">
        <thead>
          <tr className={DATA_HEAD_ROW}><th>{t("paymentNo")}</th><th>{t("reference")}</th><th>{t("received")}</th><th className="text-right">{t("amount")}</th>
            <th className="text-right">{t("unallocated")}</th><th>{t("allocatedTo")}</th><th>{t("status")}</th><th /></tr>
        </thead>
        <tbody>
          {list.data?.map((p) => (
            <tr key={p.id} className={`${DATA_ROW} align-top`}>
              <td className="font-mono">{p.paymentNo}</td>
              <td>{p.reference}{safeHref(p.evidenceUrl) && <> · <a href={safeHref(p.evidenceUrl)!} target="_blank" rel="noreferrer" className="underline">{t("evidence")}</a></>}</td>
              <td className="tabular">{p.receivedAt}</td>
              <td className="text-right"><Money amount={p.amount} currency={p.currency} /></td>
              <td className="text-right font-semibold"><Money amount={p.unallocated} currency={p.currency} /></td>
              <td>
                {p.allocations.map((a) => <div key={a.receivableId}><span className="font-mono">{a.receivableNo}</span> <Money amount={a.amount} currency={p.currency} /></div>)}
                {p.refunds.map((r) => <div key={r.id} className="text-muted-foreground">{t("refunded")} <Money amount={r.amount} currency={p.currency} /> · {r.reason}</div>)}
                {p.reversalReason && <div className="text-destructive">{p.reversalReason}</div>}
              </td>
              <td><StatusBadge group="payment" value={p.status} /></td>
              <td>
                {p.status === "recorded" && (
                  <div className="flex flex-wrap justify-end gap-1">
                    {p.unallocated !== "0.00" && <AllocateDialog payment={p} onDone={replace} />}
                    <RefundDialog payment={p} onDone={replace} />
                    <ReasonDialog trigger={t("reverse")} title={t("reverseTitle", { paymentNo: p.paymentNo })} description={t("reverseBody")}
                      confirmLabel={t("reverse")} destructive pending={reverse.isPending}
                      onConfirm={(reason) => reverse.mutate({ params: { path: { paymentId: p.id }, header: idem() }, body: { reason } },
                        { onSuccess: replace })} />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecordPayment({ onRecorded }: { onRecorded: (p: Payment) => void }) {
  const t = useTranslations("finance.payments");
  const record = $api.useMutation("post", "/finance/payments");
  const [form, setForm] = useState({ amount: "", currency: "NZD" as Currency, method: "bank_transfer" as Method, reference: "", receivedAt: "" });
  const [evidence, setEvidence] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(newIdempotencyKey);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = toMoneyString(form.amount);
    if (!amount || amount === "0.00" || !form.reference.trim() || !DATE.test(form.receivedAt)) return setError(t("invalid"));
    setError(null);
    let evidenceFileId: string | null = null;
    try {
      if (evidence) evidenceFileId = await uploadFile(evidence, "payment_evidence");
    } catch {
      return setError(t("uploadFailed"));
    }
    record.mutate({
      params: { header: { "Idempotency-Key": key } },
      body: { amount, currency: form.currency, method: form.method, reference: form.reference.trim(), receivedAt: form.receivedAt, evidenceFileId },
    }, {
      onSuccess: (p) => {
        onRecorded(p);
        setForm({ ...form, amount: "", reference: "" });
        setEvidence(null);
        setKey(newIdempotencyKey());
      },
      onError: () => setError(t("failed")),
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3 border border-rule bg-surface p-4" noValidate data-testid="record-payment">
      <h2 className="font-semibold">{t("recordTitle")}</h2>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="grid gap-1"><Label htmlFor="pay-amount">{t("amount")}</Label>
          <Input id="pay-amount" inputMode="decimal" className="tabular" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <div className="grid gap-1"><Label htmlFor="pay-currency">{t("currency")}</Label>
          <select id="pay-currency" className="h-8 border border-rule bg-background px-2" value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value as Currency })}><option>NZD</option><option>USD</option></select></div>
        <div className="grid gap-1"><Label htmlFor="pay-method">{t("method")}</Label>
          <select id="pay-method" className="h-8 border border-rule bg-background px-2" value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value as Method })}>
            {(["bank_transfer", "card", "other"] as const).map((m) => <option key={m} value={m}>{t(`methods.${m}`)}</option>)}
          </select></div>
        <div className="grid gap-1"><Label htmlFor="pay-reference">{t("reference")}</Label>
          <Input id="pay-reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
        <div className="grid gap-1"><Label htmlFor="pay-date">{t("received")}</Label>
          <Input id="pay-date" type="date" value={form.receivedAt} onChange={(e) => setForm({ ...form, receivedAt: e.target.value })} /></div>
        <div className="grid gap-1"><Label htmlFor="pay-evidence">{t("evidence")}</Label>
          <Input id="pay-evidence" type="file" accept="image/*,application/pdf" onChange={(e) => setEvidence(e.target.files?.[0] ?? null)} /></div>
      </div>
      <ErrorText className="text-sm">{error}</ErrorText>
      <Button type="submit" className="justify-self-start" disabled={record.isPending}>{t("record")}</Button>
    </form>
  );
}

function AllocateDialog({ payment, onDone }: { payment: Payment; onDone: (p: Payment) => void }) {
  const t = useTranslations("finance.payments");
  const open$ = $api.useQuery("get", "/finance/receivables");
  const allocate = $api.useMutation("post", "/finance/allocations");
  const [open, setOpen] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const candidates = (open$.data ?? []).filter((r) => r.currency === payment.currency && r.balance !== "0.00" && (r.status === "issued" || r.status === "partially_paid"));

  function confirm() {
    const entries = Object.entries(amounts).filter(([, v]) => v.trim() !== "");
    const parsed = entries.map(([receivableId, v]) => ({ receivableId, amount: toMoneyString(v) }));
    if (parsed.length === 0 || parsed.some((p) => !p.amount || p.amount === "0.00")) return setError(t("allocateInvalid"));
    allocate.mutate({
      params: { header: idem() },
      body: { paymentId: payment.id, allocations: parsed.map((p) => ({ receivableId: p.receivableId, amount: p.amount! })) },
    }, {
      onSuccess: (u) => { onDone(u); setOpen(false); },
      onError: () => setError(t("allocateRejected")),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); setAmounts({}); }}>
      <DialogTrigger asChild><Button size="sm">{t("allocate")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("allocateTitle", { paymentNo: payment.paymentNo })}</DialogTitle></DialogHeader>
        <p className="text-sm">{t("available")} <Money amount={payment.unallocated} currency={payment.currency} className="font-semibold" /></p>
        <ul className="grid gap-2">
          {candidates.map((r) => (
            <li key={r.id} className="grid grid-cols-[1fr_7rem] items-center gap-2">
              <span><span className="font-mono">{r.receivableNo}</span> {r.customer.memberNo} · {t("due")} <Money amount={r.balance} currency={r.currency} /></span>
              <Input aria-label={t("allocateFor", { receivableNo: r.receivableNo })} inputMode="decimal" className="tabular" value={amounts[r.id] ?? ""}
                onChange={(e) => setAmounts({ ...amounts, [r.id]: e.target.value })} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{t("allocateNote")}</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button onClick={confirm} disabled={allocate.isPending}>{t("allocate")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefundDialog({ payment, onDone }: { payment: Payment; onDone: (p: Payment) => void }) {
  const t = useTranslations("finance.payments");
  const refund = $api.useMutation("post", "/finance/refunds");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", reason: "", paidAt: "" });
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    const amount = toMoneyString(form.amount);
    if (!amount || amount === "0.00" || form.reason.trim().length < 3 || !DATE.test(form.paidAt)) return setError(t("refundInvalid"));
    refund.mutate({
      params: { header: idem() },
      body: { paymentId: payment.id, amount, reason: form.reason.trim(), paidAt: form.paidAt, evidenceFileId: null },
    }, { onSuccess: (u) => { onDone(u); setOpen(false); }, onError: () => setError(t("refundRejected")) });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(null); }}>
      <DialogTrigger asChild><Button size="sm" variant="outline">{t("refund")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("refundTitle", { paymentNo: payment.paymentNo })}</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="refund-amount">{t("amount")}</Label>
          <Input id="refund-amount" inputMode="decimal" className="tabular" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Label htmlFor="refund-date">{t("paidAt")}</Label>
          <Input id="refund-date" type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
          <Label htmlFor="refund-reason">{t("refundReason")}</Label>
          <Textarea id="refund-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button onClick={confirm} disabled={refund.isPending}>{t("recordRefund")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
