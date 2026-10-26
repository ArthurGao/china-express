import { getTranslations } from "next-intl/server";
import { RatesAdmin } from "@/components/rates/rates-admin";

export default async function Page() {
  const t = await getTranslations("rates");
  return (
    <div className="grid gap-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <RatesAdmin />
    </div>
  );
}
