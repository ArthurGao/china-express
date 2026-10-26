import { expect, test } from "@playwright/test";

const MESSENGER_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/482.0.0.40.110;FBBV/668000000;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.1]";

test.describe("inside Messenger", () => {
  test.use({ userAgent: MESSENGER_IOS });

  test("the login page asks to open the page in a real browser first", async ({ page }) => {
    await page.goto("/login");
    // Next adds its own role="alert" route announcer, so select the banner by its text.
    const banner = page.getByRole("alert").filter({ hasText: "Open this page in your browser" });
    await expect(banner).toContainText("Open this page in your browser");
    await expect(banner).toContainText("You are inside Messenger.");
    await expect(banner.getByRole("button", { name: "Copy link" })).toBeVisible();
  });
});

test("a normal mobile browser shows no banner", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Open this page in your browser" })).toHaveCount(0);
});
