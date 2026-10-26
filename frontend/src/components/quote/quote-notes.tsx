import Link from "next/link";
import { useTranslations } from "next-intl";

const EXCLUDED = ["residential", "inspection", "quarantine", "storage", "dangerous", "insurance", "oversize"] as const;

// GST and customs wording is fixed text, never a computed amount (DECISION(F2)). Exclusions follow DECISION(E3).
export function QuoteNotes() {
  const t = useTranslations("quote");
  return (
    <aside className="grid gap-6 border-t border-rule pt-6 text-sm md:grid-cols-2">
      <div className="grid gap-2">
        <h2 className="font-semibold">{t("gst.title")}</h2>
        <p>{t("gst.local")}</p>
        <p>{t("gst.customs")}</p>
      </div>
      <div className="grid gap-2">
        <h2 className="font-semibold">{t("excluded.title")}</h2>
        <p className="text-muted-foreground">{t("excluded.intro")}</p>
        <ul className="list-disc pl-5">
          {EXCLUDED.map((k) => <li key={k}>{t(`excluded.items.${k}`)}</li>)}
        </ul>
      </div>
      <p className="text-muted-foreground md:col-span-2">{t("disclaimer")}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-surface p-4 md:col-span-2">
        <span className="font-semibold">{t("fcl.title")}</span>
        <Link href="/quote/fcl" className="font-medium text-primary hover:underline">{t("fcl.cta")}</Link>
      </div>
    </aside>
  );
}
