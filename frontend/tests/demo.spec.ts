import { expect, test } from "@playwright/test";
import { publishSeaParcelDraft, quoteSampleParcel, signInStaff, signInWithEmailCode } from "./support/flows";

const DEMO_STAFF = { email: "ops@example.com", password: "demo" };

// The demo deployment works with nothing behind it: any email and code sign in, data comes from the contract examples.
test("a visitor signs in with any code, quotes and sends a pre-notice", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("demo-banner")).toContainText("prices are fixed worked examples");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");

  await page.goto("/quote?src=fb-marketplace");
  await expect(page).toHaveURL(/\/login\?next=%2Fquote%3Fsrc%3Dfb-marketplace$/);
  await signInWithEmailCode(page, "visitor@example.com", () => "123456", "Demo: no email is sent. Enter any 6 digits, for example 123456.");

  await expect(page).toHaveURL(/\/quote\?src=fb-marketplace$/);
  await expect(page.getByTestId("member-no")).toHaveText("CE-123456-7");
  await quoteSampleParcel(page);
  await page.getByTestId("option-SEA_PARCEL").getByRole("button", { name: "Choose this option" }).click();
  await page.getByRole("button", { name: "What to do next" }).click();
  await page.getByLabel(/I confirm my shipment contains none/).click();
  await page.getByRole("button", { name: "Send shipment notice" }).click();
  await expect(page.getByRole("heading", { name: "We have received your shipment notice." })).toBeVisible();
  await expect(page.getByTestId("label-member-no")).toHaveText("CE-123456-7");

  // Signing out locks the customer pages again.
  await page.goto("/account");
  await expect(page.getByTestId("account-member-no")).toHaveText("CE-123456-7");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/quote");
  await expect(page).toHaveURL(/\/login\?next=%2Fquote$/);
});

test("staff need the TOTP step before the rates console, then publish", async ({ page, isMobile }) => {
  test.skip(isMobile, "the staff console is a desktop screen");
  await page.goto("/staff/admin/rates");
  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(page.getByTestId("demo-banner")).toContainText("任意邮箱、密码和 6 位数字验证码");

  await expect(page.getByText("演示版：任意邮箱和密码都可以登录。")).toBeVisible();
  await signInStaff(page, DEMO_STAFF);
  // Password alone is aal1: the console still refuses.
  await expect(page.getByLabel("验证器动态码")).toBeVisible();
  await page.goto("/staff/admin/rates");
  await expect(page).toHaveURL(/\/staff\/login$/);

  await signInStaff(page, DEMO_STAFF);
  await expect(page.getByText("演示版：不需要验证器 App，输入任意 6 位数字即可，例如 123456。")).toBeVisible();
  await page.getByLabel("验证器动态码").fill("654321");
  await page.getByRole("button", { name: "验证" }).click();
  await expect(page).toHaveURL(/\/staff\/warehouse$/);
  await page.getByRole("navigation", { name: "模块" }).getByRole("link", { name: "管理" }).click();
  await expect(page).toHaveURL(/\/staff\/admin\/rates$/);
  await publishSeaParcelDraft(page, "演示调价");
});
