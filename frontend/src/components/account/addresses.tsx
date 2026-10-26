"use client";

import { upsertById } from "@/lib/api/cache";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { $api } from "@/lib/api/client";
import { AddressFields, EMPTY_ADDRESS, addressLine, validAddress, type PostalAddress } from "./address-fields";

/** Delivery addresses; the backend works out the region (and any remote surcharge) from the postcode. */
export function Addresses() {
  const t = useTranslations("account.addresses");
  const tq = useTranslations("quote.regions");
  const queryClient = useQueryClient();
  const list = $api.useQuery("get", "/me/addresses");
  const create = $api.useMutation("post", "/me/addresses");
  const [draft, setDraft] = useState<{ label: string; address: PostalAddress } | null>(null);
  const [invalid, setInvalid] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || draft.label.trim() === "" || !validAddress(draft.address)) return setInvalid(true);
    create.mutate({ body: draft }, {
      onSuccess: (address) => {
        queryClient.setQueryData($api.queryOptions("get", "/me/addresses").queryKey, upsertById(address));
        setDraft(null);
      },
    });
  }

  return (
    <section className="grid gap-3" aria-labelledby="addresses-title">
      <h2 id="addresses-title" className="text-lg font-semibold">{t("title")}</h2>
      <ul className="divide-y divide-rule border-y border-rule" data-testid="addresses">
        {list.data?.map((a) => (
          <li key={a.id} className="grid gap-0.5 py-3 text-sm">
            <span className="font-medium">{a.label}{a.isDefault && <span className="ml-2 text-xs text-muted-foreground">{t("default")}</span>}</span>
            <span className="text-muted-foreground">{addressLine(a.address)} · {tq(a.region)}</span>
          </li>
        ))}
      </ul>
      {draft ? (
        <form onSubmit={save} className="grid gap-3 border border-rule bg-surface p-4" noValidate>
          <Label htmlFor="address-label">{t("label")}</Label>
          <Input id="address-label" className="h-11" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          <AddressFields idPrefix="delivery" value={draft.address} onChange={(address) => setDraft({ ...draft, address })} />
          {invalid && <p className="text-sm text-destructive">{t("invalid")}</p>}
          <div className="flex gap-2">
            <Button type="submit" className="h-11" disabled={create.isPending}>{t("save")}</Button>
            <Button type="button" variant="ghost" className="h-11" onClick={() => setDraft(null)}>{t("cancel")}</Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" className="h-11 justify-self-start" onClick={() => { setInvalid(false); setDraft({ label: "", address: EMPTY_ADDRESS }); }}>{t("add")}</Button>
      )}
    </section>
  );
}
