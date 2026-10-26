import { expect, test } from "@playwright/test";
import { TINY_PNG, signInDemoStaff, signInWithEmailCode } from "./support/flows";

// Stage 2–3 screens on the demo build: data comes from the contract examples, so each step shows the example the
// backend would return.

test("a customer chooses consolidation, confirms the final price and sees how to pay", async ({ page }) => {
  await page.goto("/shipments");
  await signInWithEmailCode(page, "visitor@example.com", () => "123456", "Demo: no email is sent. Enter any 6 digits, for example 123456.");
  await expect(page).toHaveURL(/\/shipments$/);
  await expect(page.getByRole("link", { name: /Notifications\s*2/ })).toBeVisible();

  await page.getByTestId("shipment-list").getByRole("link", { name: /PN-2610-0002/ }).click();
  await page.getByRole("radio", { name: /Combine into fewer cartons/ }).check();
  await page.getByRole("button", { name: "Confirm my choice" }).click();
  await expect(page.getByTestId("handling-chosen")).toContainText("Combine into fewer cartons");

  await page.goto("/shipments");
  await page.getByTestId("shipment-list").getByRole("link", { name: /CE-S2610-0001/ }).click();
  await expect(page.getByTestId("final-price")).toContainText(/NZD\s51\.00/);
  await page.getByRole("button", { name: "Confirm final price" }).click();
  await expect(page.getByTestId("bank-reference")).toHaveText("R2610-0001");
  await expect(page.getByTestId("balance")).toHaveText(/NZD\s55\.80/);
  await page.screenshot({ path: `test-results/demo-shipment-${test.info().project.name}.png`, fullPage: true });
});

test.describe("staff console", () => {
  test.beforeEach(async ({ isMobile, page }) => {
    test.skip(isMobile, "the staff console is a desktop and tablet screen");
    await page.addInitScript(() => { window.print = () => {}; });
    await signInDemoStaff(page);
  });

  test("warehouse receives a parcel with a photo and gets its label", async ({ page }) => {
    await page.getByLabel("扫描快递面单或唛头").fill("SF1234567890123");
    await page.getByLabel("扫描快递面单或唛头").press("Enter");
    await expect(page.getByTestId("scan-result")).toContainText("已匹配预报");
    for (const [label, value] of [["重量 kg", "4.2"], ["长 cm", "40"], ["宽 cm", "30"], ["高 cm", "25"]]) await page.getByLabel(label).fill(value);
    await page.getByLabel("拍照").setInputFiles({ name: "box.png", mimeType: "image/png", buffer: TINY_PNG });
    await expect(page.getByTestId("photo-strip").getByText("已上传")).toBeVisible();
    await page.getByRole("button", { name: "确认入库" }).click();
    await expect(page.getByTestId("parcel-label")).toContainText("P2610-000125");
    await expect(page.getByTestId("upload-waiting")).toHaveText("照片已全部上传");
    await page.screenshot({ path: "test-results/demo-warehouse-receive.png", fullPage: true });
  });

  test("operations roll a shipment back with a reason", async ({ page }) => {
    await page.getByRole("navigation", { name: "模块" }).getByRole("link", { name: "运营" }).click();
    await page.getByTestId("exceptions").getByRole("link", { name: "CE-S2610-0002" }).click();
    await page.getByRole("button", { name: "回退到：清关中" }).click();
    await page.getByRole("dialog").getByLabel("原因（记入审计日志）").fill("海关已放行，误点扣留");
    await page.getByRole("dialog").getByRole("button", { name: "确认" }).click();
    await expect(page.getByRole("status").filter({ hasText: "状态已更新为" })).toBeVisible();
  });

  test("finance records a payment and allocates it", async ({ page }) => {
    await page.goto("/staff/finance/payments");
    const form = page.getByTestId("record-payment");
    await form.getByLabel("金额").fill("55.80");
    await form.getByLabel("参考号").fill("R2610-0001");
    await form.getByLabel("到账日期").fill("2026-10-27");
    await form.getByRole("button", { name: "登记收款" }).click();
    const row = page.getByTestId("payments").getByRole("row").filter({ hasText: "PAY-2610-0009" }).first();
    await row.getByRole("button", { name: "分配" }).click();
    await page.getByRole("dialog").getByLabel("R2610-0001 分配金额").fill("55.80");
    await page.getByRole("dialog").getByRole("button", { name: "分配" }).click();
    await expect(page.getByTestId("payments").getByRole("row").filter({ hasText: "PAY-2610-0009" }).first()).toContainText("R2610-0001");
    await page.screenshot({ path: "test-results/demo-finance-payments.png", fullPage: true });
  });

  test("admin sees staff and the audit log", async ({ page }) => {
    await page.goto("/staff/admin/staff");
    await expect(page.getByTestId("staff")).toContainText("陈仓");
    await page.getByRole("navigation", { name: "管理" }).getByRole("link", { name: "审计日志" }).click();
    await expect(page.getByTestId("audit")).toContainText("parcel.measurements_corrected");
  });
});
