"use client";

import { safeHref } from "@/lib/safe-href";
import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { $api } from "@/lib/api/client";

export function OpsSearch() {
  const t = useTranslations("ops.search");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const results = $api.useQuery("get", "/ops/search", { params: { query: { q } } }, { enabled: q.length >= 2 });
  return (
    <div className="grid gap-4">
      <form className="flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); setQ(text.trim()); }}>
        <Input aria-label={t("label")} placeholder={t("placeholder")} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <Button type="submit">{t("submit")}</Button>
      </form>
      {results.isError && <ErrorText>{t("failed")}</ErrorText>}
      {results.data && (results.data.length === 0 ? <p className="text-muted-foreground">{t("none")}</p> : (
        <ul className="divide-y divide-rule border-y border-rule" data-testid="search-results">
          {results.data.map((r) => (
            <li key={`${r.type}-${r.id}`}>
              <Link href={safeHref(r.href) ?? "#"} className="grid grid-cols-[6rem_1fr] gap-x-3 py-2 hover:bg-surface">
                <span className="text-xs text-muted-foreground uppercase">{t(`types.${r.type}`)}</span>
                <span><span className="font-mono">{r.reference}</span> · {r.title}<span className="block text-muted-foreground">{r.subtitle}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
