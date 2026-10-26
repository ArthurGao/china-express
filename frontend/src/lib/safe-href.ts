import { sameSitePath } from "@/lib/auth/routes";

/**
 * A URL from the API that is safe to put in an href or navigate to: a path on this site, or an absolute https URL
 * (courier tracking, signed Storage files, the payment gateway). Anything else — `javascript:`, `data:`, plain http,
 * protocol-relative — gives null, so the link is not rendered. The backend validates too; this is defence in depth.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/")) return sameSitePath(url);
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}
