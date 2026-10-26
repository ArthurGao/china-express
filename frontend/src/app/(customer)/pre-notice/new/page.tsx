import { getTranslations } from "next-intl/server";
import { PreNoticeForm } from "@/components/pre-notice/pre-notice-form";
import type { Product } from "@/lib/api/types";

const PRODUCTS: Product[] = ["SEA_PARCEL", "SEA_LCL", "AIR"];

export default async function Page({ searchParams }: PageProps<"/pre-notice/new">) {
  const t = await getTranslations("preNotice.new");
  const { quote, product } = await searchParams;
  const quoteId = typeof quote === "string" ? quote : null;
  const chosen = PRODUCTS.find((p) => p === product) ?? null;
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("intro")}</p>
      </div>
      <PreNoticeForm quoteId={quoteId} product={chosen} />
    </div>
  );
}
