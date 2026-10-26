import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CustomerNav, CustomerTabs } from "@/components/customer-nav";

export default async function CustomerLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("common");
  return (
    <div className="flex min-h-full flex-col">
      <header className="no-print border-b border-rule bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="text-base font-semibold tracking-[0.12em] whitespace-nowrap text-foreground uppercase">
            {t("brand")}
          </Link>
          <CustomerNav />
        </div>
      </header>
      <CustomerTabs />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
