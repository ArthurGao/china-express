export const locales = ["en", "zh-CN"] as const;
export type Locale = (typeof locales)[number];

// Customer pages are always English; staff pages default to Chinese and can switch.
export const CUSTOMER_LOCALE: Locale = "en";
export const STAFF_DEFAULT_LOCALE: Locale = "zh-CN";

export const AREA_HEADER = "x-ce-area";
export const STAFF_LOCALE_COOKIE = "ce-staff-locale";

export type Area = "customer" | "staff";

export function areaForPath(pathname: string): Area {
  return pathname === "/staff" || pathname.startsWith("/staff/") ? "staff" : "customer";
}

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}
