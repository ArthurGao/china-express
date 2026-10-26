"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { $api } from "@/lib/api/client";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "./data-table";
import { RateVersionPanel } from "./rate-version-panel";

export function RatesAdmin() {
  const t = useTranslations("rates");
  const cards = $api.useQuery("get", "/admin/rate-cards");
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | undefined>();

  if (cards.isError) {
    const forbidden = (cards.error as { status?: number } | null)?.status === 403;
    return <p role="alert" className="text-destructive">{t(forbidden ? "errors.forbidden" : "errors.load")}</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="grid content-start gap-2">
        <h2 className="text-base font-semibold">{t("cards")}</h2>
        <table className={DATA_TABLE}>
          <thead>
            <tr className={DATA_HEAD_ROW}>
              <th>{t("product")}</th>
              <th className="text-right">{t("version")}</th>
              <th>{t("status")}</th>
              <th>{t("effective")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cards.data?.flatMap((card) => card.versions.map((v) => (
              <tr key={v.id} className={`${DATA_ROW} ${selected === v.id ? "bg-accent" : ""}`}>
                <td>{t(`productNames.${card.product}`)}</td>
                <td className="tabular text-right">{v.version}</td>
                <td><Badge variant={v.status === "draft" ? "outline" : "secondary"}>{t(`statuses.${v.status}`)}</Badge></td>
                <td className="font-mono text-xs">{v.effectiveFrom}{v.effectiveTo ? ` → ${v.effectiveTo}` : ""}</td>
                <td className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => { setSelected(v.id); setNotice(undefined); }} aria-label={`${t("open")} ${t(`productNames.${card.product}`)} v${v.version}`}>
                    {t("open")}
                  </Button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </section>
      <div className="border-t border-rule pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
        {selected ? (
          <RateVersionPanel key={selected} versionId={selected} notice={notice}
            onDraftCreated={(id, version) => { setSelected(id); setNotice(t("draft.created", { version })); }} />
        ) : <p className="text-muted-foreground">{t("selectVersion")}</p>}
      </div>
    </div>
  );
}
