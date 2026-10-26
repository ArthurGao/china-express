"use client";

import { useLocale } from "next-intl";
import type { components } from "@/lib/api/generated/schema";

export type I18nText = components["schemas"]["I18nText"];

/** Text the backend sends in both languages (line labels, timeline entries, reasons), picked for the page's locale. */
export function useLocalized(): (text: I18nText) => string {
  const locale = useLocale();
  return (text) => (locale === "zh-CN" ? text.zh : text.en);
}
