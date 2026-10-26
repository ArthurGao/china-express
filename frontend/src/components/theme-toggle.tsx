"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { THEME_COOKIE, THEMES, parseTheme, resolveTheme, type Theme } from "@/lib/theme/theme";

const CHANGE = "ce-theme-change";

// The choice lives on <html data-choice> (set by the server from the cookie); the server snapshot keeps hydration stable.
const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
};
const current = () => parseTheme(document.documentElement.dataset.choice);
const onServer = (): Theme => "light";

/** Light / dark / follow the system; remembered for a year and applied at once without reloading. */
export function ThemeToggle() {
  const t = useTranslations("theme");
  const theme = useSyncExternalStore(subscribe, current, onServer);

  function choose(next: Theme) {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const root = document.documentElement;
    root.dataset.choice = next;
    root.dataset.theme = resolveTheme(next, window.matchMedia("(prefers-color-scheme: dark)").matches);
    window.dispatchEvent(new Event(CHANGE));
  }

  return (
    <select aria-label={t("label")} value={theme} onChange={(e) => choose(e.target.value as Theme)}
      className="h-11 border border-rule bg-background px-2 text-sm text-foreground">
      {THEMES.map((option) => <option key={option} value={option}>{t(option)}</option>)}
    </select>
  );
}
