import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { AREA_HEADER, CUSTOMER_LOCALE, STAFF_DEFAULT_LOCALE, STAFF_LOCALE_COOKIE, isLocale, type Locale } from "./config";

export default getRequestConfig(async () => {
  const area = (await headers()).get(AREA_HEADER);
  let locale: Locale = CUSTOMER_LOCALE;
  if (area === "staff") {
    const chosen = (await cookies()).get(STAFF_LOCALE_COOKIE)?.value;
    locale = isLocale(chosen) ? chosen : STAFF_DEFAULT_LOCALE;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    timeZone: "Pacific/Auckland",
  };
});
