"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { $api } from "@/lib/api/client";

// The address text (with the member number) comes from the backend as the exact Chinese copy suppliers need.
export function WarehouseAddress() {
  const t = useTranslations("preNotice.address");
  const { data } = $api.useQuery("get", "/warehouse-address", {}, { staleTime: Infinity });
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  async function copy() {
    if (!data) return;
    await navigator.clipboard.writeText(data.copyText);
    setCopied(true);
  }

  return (
    <section className="grid gap-3 border border-rule bg-surface p-4" aria-labelledby="wh-title">
      <h2 id="wh-title" className="text-lg font-semibold">{t("title")}</h2>
      <p className="border-y border-rule py-2 text-sm">
        <strong>{t("important")}</strong> {t("markRule")}
      </p>
      {data.isPlaceholder && <p className="text-sm text-warning">{t("placeholder")}</p>}
      <pre lang="zh-CN" data-testid="warehouse-address" className="font-sans text-sm leading-relaxed whitespace-pre-wrap">{data.copyText}</pre>
      <Button type="button" className="h-12 justify-self-start" onClick={copy}>{copied ? t("copied") : t("copy")}</Button>
    </section>
  );
}
