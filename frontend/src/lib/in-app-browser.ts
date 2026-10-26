// Facebook, Messenger, Instagram and WhatsApp open links in an embedded webview. Google sign-in refuses embedded
// browsers, and a session started there does not follow the customer to Safari or Chrome (risk R4), so the login
// page asks them to open the page in their real browser first.
export type InAppBrowser = "facebook" | "messenger" | "instagram" | "whatsapp";

const PATTERNS: [InAppBrowser, RegExp][] = [
  ["messenger", /\bMessenger|FBAN\/Messenger|FB_IAB\/MESSENGER/i],
  ["instagram", /\bInstagram\b/i],
  ["whatsapp", /\bWhatsApp\b/i],
  ["facebook", /\bFBAN\/|\bFBAV\/|\bFB_IAB\/|\bFBIOS\b/],
];

export function detectInAppBrowser(userAgent: string | null | undefined): InAppBrowser | null {
  if (!userAgent) return null;
  for (const [name, re] of PATTERNS) if (re.test(userAgent)) return name;
  return null;
}
