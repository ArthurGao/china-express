import { expect, test, type Page } from "@playwright/test";
import { generate } from "otplib";
import { publishSeaParcelDraft, signInStaff } from "./support/flows";
import { STAFF } from "./support/supabase";

const signIn = (page: Page) => signInStaff(page, STAFF);

// TOTP codes are 30-second windows; wait for a fresh window so enrolment and the next sign-in never reuse a code.
async function freshCode(secret: string) {
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  if (remaining < 5) await new Promise((r) => setTimeout(r, (remaining + 1) * 1000));
  return generate({ secret });
}

test("staff sign in with mandatory TOTP, then draft, simulate and publish a rate change", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/staff/admin/rates");
  await expect(page).toHaveURL(/\/staff\/login$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");

  // First sign-in: enrol an authenticator.
  await signIn(page);
  await expect(page.getByText("必须开启两步验证")).toBeVisible();
  const secret = (await page.getByTestId("totp-secret").textContent())!.trim();
  await page.getByLabel("验证器动态码").fill(await freshCode(secret));
  await page.getByRole("button", { name: "验证" }).click();
  // /staff opens the first module the roles allow (warehouse for this all-roles account).
  await expect(page).toHaveURL(/\/staff\/warehouse$/);

  // Second sign-in: the enrolled factor is verified, not enrolled again.
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/staff\/login$/);
  await page.goto("/staff/admin/rates");
  await expect(page).toHaveURL(/\/staff\/login$/);
  await signIn(page);
  await expect(page.getByTestId("totp-secret")).toHaveCount(0);
  await new Promise((r) => setTimeout(r, (31 - (Math.floor(Date.now() / 1000) % 30)) * 1000));
  await page.getByLabel("验证器动态码").fill(await generate({ secret }));
  await page.getByRole("button", { name: "验证" }).click();
  await expect(page).toHaveURL(/\/staff\/warehouse$/);
  await page.getByRole("navigation", { name: "模块" }).getByRole("link", { name: "管理" }).click();
  await expect(page).toHaveURL(/\/staff\/admin\/rates$/);

  // Rate change: draft → simulate → publish with a reason.
  await publishSeaParcelDraft(page, "11 月奥克兰调价");
  await page.screenshot({ path: "test-results/staff-rates.png", fullPage: true });
});
