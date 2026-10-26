import { useTranslations } from "next-intl";

// DECISION(X-3): placeholder list from common NZ import and carrier restrictions until the owner supplies the
// official prohibited / restricted goods list (handover §8.3, risk R15).
const ITEMS = ["dangerous", "weapons", "drugs", "counterfeit", "biosecurity", "valuables"] as const;

export function ProhibitedGoodsList() {
  const t = useTranslations("preNotice.prohibited");
  return (
    <div className="grid gap-2 border border-rule bg-surface p-4">
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <ul className="list-disc pl-5 text-sm">
        {ITEMS.map((k) => <li key={k}>{t(`items.${k}`)}</li>)}
      </ul>
    </div>
  );
}
