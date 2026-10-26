import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
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
import { SYSTEM_THEME_SCRIPT, THEME_COOKIE, parseTheme } from "@/lib/theme/theme";

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
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    // "system" renders light on the server and is resolved by the inline script before first paint.
    <html lang={locale} className="h-full antialiased" data-choice={theme} data-theme={theme === "dark" ? "dark" : "light"} suppressHydrationWarning>
      <head>
        {theme === "system" && <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />}
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          {DEMO && <DemoBanner />}
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
