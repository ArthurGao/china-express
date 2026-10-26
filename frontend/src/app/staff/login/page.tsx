import { getTranslations } from "next-intl/server";
import { StaffLogin } from "@/components/auth/staff-login";

export default async function StaffLoginPage() {
  const t = await getTranslations("staffAuth");
  return (
    <div className="mx-auto grid max-w-sm gap-6 px-4 py-12">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <StaffLogin />
    </div>
  );
}
