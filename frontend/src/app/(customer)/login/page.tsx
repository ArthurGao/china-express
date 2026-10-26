import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CustomerLogin } from "@/components/auth/customer-login";
import { InAppBrowserBanner } from "@/components/auth/in-app-browser-banner";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <div className="mx-auto grid max-w-md gap-6">
      <InAppBrowserBanner />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("intro")}</p>
      </div>
      <Suspense>
        <CustomerLogin />
      </Suspense>
    </div>
  );
}
