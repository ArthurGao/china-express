import { expect, type Page } from "@playwright/test";

// Steps shared by the real-auth specs and the demo spec. Data comes from the contract examples in both.

export async function signInWithEmailCode(page: Page, email: string, code: () => Promise<string> | string) {
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText(`We sent a code to ${email}.`)).toBeVisible();
  await page.getByLabel("6-digit code").fill(await code());
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** The design 04 worked example: one 30×20×20 cm, 7 kg carton to Auckland, NZ$250 declared. */
export async function quoteSampleParcel(page: Page) {
  await page.getByLabel("Auckland").check();
  await page.getByLabel("Nearest city").selectOption("akl");
  await page.getByLabel("Length cm").fill("30");
  await page.getByLabel("Width cm").fill("20");
  await page.getByLabel("Height cm").fill("20");
  await page.getByLabel("Weight kg").fill("7");
  await page.getByLabel("Total value of all items together").fill("250");
  await page.getByRole("button", { name: "Get my quote" }).click();
  await expect(page.getByTestId("total-SEA_PARCEL-NZD")).toHaveText(/NZD\s26\.00\+GST/);
}

export async function signInStaff(page: Page, { email, password }: { email: string; password: string }) {
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
}

/** Draft a new sea-parcel version from v1, simulate it, then publish it with `reason`. */
export async function publishSeaParcelDraft(page: Page, reason: string) {
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
  await dialog.getByLabel("发布原因").fill(reason);
  await dialog.getByRole("button", { name: "确认发布" }).click();
  await expect(panel.getByRole("status")).toHaveText("已发布第 2 版，2026-11-01 起生效。");
}
