import { getTranslations } from "next-intl/server";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function Page() {
  const t = await getTranslations("notifications");
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <NotificationList />
    </div>
  );
}
