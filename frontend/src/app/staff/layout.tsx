import { getTranslations } from "next-intl/server";
import { StaffNav, StaffSubNav } from "@/components/staff-nav";
import { StaffRouteGuard } from "@/components/staff/staff-route-guard";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-full flex-col text-sm">
      <header className="no-print border-b border-rule bg-surface">
        <div className="flex h-12 items-center gap-6 px-4">
          <span className="font-semibold tracking-[0.12em] uppercase">{t("brand")}</span>
          <StaffNav />
        </div>
      </header>
      <StaffSubNav />
      <div className="flex-1"><StaffRouteGuard>{children}</StaffRouteGuard></div>
    </div>
  );
}
