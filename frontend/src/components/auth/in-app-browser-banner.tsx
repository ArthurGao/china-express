"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { detectInAppBrowser } from "@/lib/in-app-browser";

// The user agent never changes during a visit; the server snapshot is null so the banner only appears after hydration.
const noSubscribe = () => () => {};
const browserUserAgent = () => navigator.userAgent;
const serverUserAgent = () => null;

export function InAppBrowserBanner({ userAgent }: { userAgent?: string }) {
  const t = useTranslations("auth.inApp");
  const detected = useSyncExternalStore(noSubscribe, browserUserAgent, serverUserAgent);
  const app = detectInAppBrowser(userAgent ?? detected);
  const [copied, setCopied] = useState(false);

  if (!app) return null;

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <div role="alert" className="border border-rule border-t-2 border-t-foreground bg-surface p-4">
      <p className="font-semibold">{t("title")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("body", { app: t(`apps.${app}`) })}</p>
      <Button type="button" variant="outline" className="mt-3 h-11" onClick={copyLink}>
        {copied ? t("copied") : t("copy")}
      </Button>
    </div>
  );
}
