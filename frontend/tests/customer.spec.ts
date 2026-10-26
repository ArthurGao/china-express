import { expect, test } from "@playwright/test";
import { readOtp } from "./support/supabase";

// Stage 1 main flow on phones: sales link → login (email code) → quote → pre-notice → copy address.
test("a customer from a sales link signs in, quotes and sends a pre-notice", async ({ page, context, browserName }, info) => {
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const email = `e2e-${info.project.name}-${Date.now()}@chinaexpress.test`;

  await page.goto("/quote?src=fb-marketplace&ref=sales-amy");
  await expect(page).toHaveURL(/\/login\?next=%2Fquote%3Fsrc%3Dfb-marketplace%26ref%3Dsales-amy$/);

  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByText(`We sent a code to ${email}.`)).toBeVisible();
  await page.getByLabel("6-digit code").fill(await readOtp(email));
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/quote\?src=fb-marketplace&ref=sales-amy$/);
  await expect(page.getByTestId("member-no")).toHaveText("CE-123456-7");

  await page.getByLabel("Auckland").check();
  await page.getByLabel("Nearest city").selectOption("akl");
  await page.getByLabel("Length cm").fill("30");
  await page.getByLabel("Width cm").fill("20");
  await page.getByLabel("Height cm").fill("20");
  await page.getByLabel("Weight kg").fill("7");
  await page.getByLabel("Total value of all items together").fill("250");
  await page.getByRole("button", { name: "Get my quote" }).click();

  const parcel = page.getByTestId("option-SEA_PARCEL");
  await expect(parcel.getByTestId("total-SEA_PARCEL-NZD")).toHaveText(/NZD\s26\.00\+GST/);
  await expect(page.getByTestId("option-AIR")).toContainText("Needs a manual quote");
  await expect(page.getByRole("button", { name: "What to do next" })).toBeDisabled();
  await parcel.getByRole("button", { name: "Choose this option" }).click();
  await page.getByRole("button", { name: "What to do next" }).click();

  await expect(page).toHaveURL(/\/pre-notice\/new\?quote=.+&product=SEA_PARCEL$/);
  await expect(page.getByText("Your chosen option")).toBeVisible();
  await page.getByRole("button", { name: "Send shipment notice" }).click();
  await expect(page.getByText("Please confirm before sending the notice.")).toBeVisible();
  await page.getByLabel(/I confirm my shipment contains none/).click();
  await page.getByRole("button", { name: "Send shipment notice" }).click();

  await expect(page).toHaveURL(/\/pre-notice\/0193a5d0-3333-7000-8000-000000000001$/);
  await expect(page.getByRole("heading", { name: "We have received your shipment notice." })).toBeVisible();
  await expect(page.getByTestId("warehouse-address")).toContainText("CE-123456-7");
  await expect(page.getByTestId("label-member-no")).toHaveText("CE-123456-7");
  if (browserName === "chromium") {
    await page.getByRole("button", { name: "Copy address for my supplier" }).click();
    await expect(page.getByRole("button", { name: "Address copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("CE-123456-7");
  }
  await page.screenshot({ path: `test-results/pre-notice-${info.project.name}.png`, fullPage: true });
});

test("a signed-out visitor cannot reach the quote page", async ({ page }) => {
  await page.goto("/quote");
  await expect(page).toHaveURL(/\/login\?next=%2Fquote$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
