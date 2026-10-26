import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
// Latin subsets only: Chinese falls back to system fonts, and no Cyrillic/Greek/Vietnamese faces are needed.
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/big-shoulders-stencil-display/latin-800";
import "./globals.css";
import { DemoBanner } from "@/components/demo-banner";
import { Providers } from "@/components/providers";
import { DEMO } from "@/lib/demo";

export const metadata: Metadata = {
  title: "China Express",
  description: "China to New Zealand freight, door to door.",
  // A demo build (ADR 0004) shows sample data only and must not be indexed.
  ...(DEMO && { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          {DEMO && <DemoBanner />}
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
