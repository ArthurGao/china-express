import { getTranslations } from "next-intl/server";
import { ShipmentList } from "@/components/shipments/shipment-list";

export default async function Page() {
  const t = await getTranslations("shipments");
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <ShipmentList />
    </div>
  );
}
