// Light is the designed default (logistics-industrial on paper); dark and "follow the system" are a viewer's choice,
// kept in a cookie so the server renders the right colours on the first paint.

export const THEME_COOKIE = "ce-theme";
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export function parseTheme(value: string | undefined): Theme {
  return THEMES.includes(value as Theme) ? (value as Theme) : "light";
}

/** The colours to show: "system" follows the device setting. */
export function resolveTheme(theme: Theme, prefersDark: boolean): "light" | "dark" {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

/**
 * Inline in <head>, before first paint: resolves "system" from the device setting (the server cannot know it) and keeps
 * following it while the page is open. Light and dark need no script; the server already set data-theme.
 */
export const SYSTEM_THEME_SCRIPT = `(function(){var r=document.documentElement;if(r.dataset.choice!=="system")return;var m=matchMedia("(prefers-color-scheme: dark)");function a(){r.dataset.theme=m.matches?"dark":"light"}a();m.addEventListener("change",a)})();`;
