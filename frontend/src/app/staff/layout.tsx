import { getTranslations } from "next-intl/server";
import { StaffNav } from "@/components/staff-nav";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-full flex-col text-sm">
      <header className="border-b border-rule bg-surface">
        <div className="flex h-12 items-center gap-6 px-4">
          <span className="font-semibold tracking-[0.12em] uppercase">{t("brand")}</span>
          <StaffNav />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
