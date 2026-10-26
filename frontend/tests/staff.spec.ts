import { expect, test, type Page } from "@playwright/test";
import { generate } from "otplib";
import { STAFF } from "./support/supabase";

async function signIn(page: Page) {
  await page.getByLabel("邮箱").fill(STAFF.email);
  await page.getByLabel("密码").fill(STAFF.password);
  await page.getByRole("button", { name: "登录" }).click();
}

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
  await expect(page).toHaveURL(/\/staff\/admin\/rates$/);

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
  await expect(page).toHaveURL(/\/staff\/admin\/rates$/);

  // Rate change: draft → simulate → publish with a reason.
  await page.getByRole("button", { name: "查看 海运小包 v1" }).click();
  const panel = page.getByTestId("rate-version-panel");
  await panel.getByRole("button", { name: "基于此版本新建草稿" }).click();
  await panel.getByLabel("奥克兰 每 kg (NZD) 1").fill("2.20");
  await panel.getByLabel("生效日期").fill("2026-11-01");
  await panel.getByRole("button", { name: "创建草稿" }).click();
  await expect(panel.getByText("已创建第 2 版草稿。")).toBeVisible();
  await panel.getByRole("button", { name: "试算" }).click();
  await expect(panel.getByTestId("simulation")).toContainText("上涨 1 · 下降 0 · 不变 1");
  await panel.getByRole("button", { name: "发布" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("发布原因").fill("11 月奥克兰调价");
  await dialog.getByRole("button", { name: "确认发布" }).click();
  await expect(panel.getByRole("status")).toHaveText("已发布第 2 版，2026-11-01 起生效。");
  await page.screenshot({ path: "test-results/staff-rates.png", fullPage: true });
});
