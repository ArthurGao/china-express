import { getTranslations } from "next-intl/server";

/** Common frame for staff console pages; `ns` names the message namespace holding `title` and `intro`. */
export async function StaffPage({ ns, children }: { ns?: string; children: React.ReactNode }) {
  const t = ns ? await getTranslations(ns) : null;
  return (
    <div className="grid gap-4 px-4 py-6">
      {t && (
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          {t.has("intro") && <p className="text-muted-foreground">{t("intro")}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
