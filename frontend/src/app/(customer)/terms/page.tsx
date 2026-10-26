import { getTranslations } from "next-intl/server";

// DECISION(X-5): the owner supplies the terms of service; until then the page says so instead of inventing terms.
const SECTIONS = ["service", "prohibited", "prices", "payment", "liability", "privacy"] as const;

export default async function Page() {
  const t = await getTranslations("terms");
  return (
    <article className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p role="note" className="border border-rule bg-surface p-4 text-sm font-medium text-warning">{t("placeholder")}</p>
      {SECTIONS.map((s, i) => (
        <section key={s} className="grid gap-2">
          <h2 className="flex items-baseline gap-3 text-lg font-semibold">
            <span className="font-stencil text-xl">{String(i + 1).padStart(2, "0")}</span>{t(`sections.${s}.title`)}
          </h2>
          <p className="text-muted-foreground">{t(`sections.${s}.body`)}</p>
        </section>
      ))}
    </article>
  );
}
