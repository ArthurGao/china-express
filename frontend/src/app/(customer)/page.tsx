import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LeadTouch } from "@/components/lead-touch";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const steps = ["one", "two", "three"] as const;
  return (
    <div className="grid gap-12 md:grid-cols-12">
      <LeadTouch stage="LANDING" />
      <section className="md:col-span-7">
        <h1 className="text-3xl leading-tight font-semibold tracking-tight md:text-5xl">{t("title")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("intro")}</p>
        <Button asChild size="lg" className="mt-8 h-12 px-6 text-base">
          <Link href="/quote">{t("cta")}</Link>
        </Button>
      </section>
      <section className="border-t border-rule pt-6 md:col-span-5 md:border-t-0 md:border-l md:pt-0 md:pl-8">
        <h2 className="text-lg font-semibold">{t("steps.title")}</h2>
        <ol className="mt-4 divide-y divide-rule">
          {steps.map((key, i) => (
            <li key={key} className="grid grid-cols-[3rem_1fr] gap-2 py-4">
              <span className="font-stencil text-3xl leading-none text-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span>{t(`steps.${key}`)}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
