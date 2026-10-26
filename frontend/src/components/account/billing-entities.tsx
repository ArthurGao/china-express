"use client";

import { upsertById } from "@/lib/api/cache";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { AddressFields, EMPTY_ADDRESS, addressLine, validAddress } from "./address-fields";

type BillingEntityCreate = components["schemas"]["BillingEntityCreate"];

/** Who invoices are made out to (stage 2). The invoice keeps a snapshot, so later edits never change issued invoices. */
export function BillingEntities() {
  const t = useTranslations("account.billing");
  const queryClient = useQueryClient();
  const list = $api.useQuery("get", "/me/billing-entities");
  const create = $api.useMutation("post", "/me/billing-entities");
  const [form, setForm] = useState<BillingEntityCreate | null>(null);
  const [invalid, setInvalid] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form || form.legalName.trim().length < 2 || !validAddress(form.address)) return setInvalid(true);
    create.mutate({ body: { ...form, gstNumber: form.gstNumber?.trim() || null } }, {
      onSuccess: (entity) => {
        queryClient.setQueryData($api.queryOptions("get", "/me/billing-entities").queryKey, upsertById(entity));
        setForm(null);
      },
    });
  }

  return (
    <section className="grid gap-3" aria-labelledby="billing-title">
      <h2 id="billing-title" className="text-lg font-semibold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <ul className="divide-y divide-rule border-y border-rule" data-testid="billing-entities">
        {list.data?.map((b) => (
          <li key={b.id} className="grid gap-0.5 py-3 text-sm">
            <span className="font-medium">{b.legalName}{b.isDefault && <span className="ml-2 text-xs text-muted-foreground">{t("default")}</span>}</span>
            <span className="text-muted-foreground">{t(`types.${b.type}`)}{b.gstNumber ? ` · GST ${b.gstNumber}` : ""}</span>
            <span className="text-muted-foreground">{addressLine(b.address)}</span>
          </li>
        ))}
      </ul>
      {form ? (
        <form onSubmit={save} className="grid gap-3 border border-rule bg-surface p-4" noValidate>
          <fieldset className="flex gap-4">
            <legend className="sr-only">{t("type")}</legend>
            {(["individual", "company"] as const).map((type) => (
              <label key={type} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="entity-type" checked={form.type === type} onChange={() => setForm({ ...form, type })} className="size-5" />
                {t(`types.${type}`)}
              </label>
            ))}
          </fieldset>
          <Label htmlFor="legal-name">{t("legalName")}</Label>
          <Input id="legal-name" className="h-11" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
          {form.type === "company" && (
            <>
              <Label htmlFor="gst-number">{t("gstNumber")}</Label>
              <Input id="gst-number" className="h-11" value={form.gstNumber ?? ""} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
            </>
          )}
          <AddressFields idPrefix="billing" value={form.address} onChange={(address) => setForm({ ...form, address })} />
          {invalid && <p className="text-sm text-destructive">{t("invalid")}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="h-11" disabled={create.isPending}>{t("save")}</Button>
            <Button type="button" variant="ghost" className="h-11" onClick={() => setForm(null)}>{t("cancel")}</Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" className="h-11 justify-self-start" onClick={() => { setInvalid(false); setForm({ type: "individual", legalName: "", gstNumber: null, address: EMPTY_ADDRESS }); }}>
          {t("add")}
        </Button>
      )}
    </section>
  );
}
