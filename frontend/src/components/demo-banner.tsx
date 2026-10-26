import { useTranslations } from "next-intl";

/** Shown on every page of a demo build (ADR 0004; rendered by the root layout) so nobody mistakes the sample data for a real quote. */
export function DemoBanner() {
  const t = useTranslations("demo");
  return (
    <div role="note" data-testid="demo-banner" className="no-print border-b border-rule bg-surface px-4 py-2 text-sm">
      <span className="mr-2 font-semibold text-warning uppercase">{t("label")}</span>
      {t("body")}
    </div>
  );
}
