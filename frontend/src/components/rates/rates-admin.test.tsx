import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { beforeEach, describe, expect, it } from "vitest";
import { apiUrl, exampleFor } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { normalizeSpaces as nbsp } from "@/test/text";
import { RatesAdmin } from "./rates-admin";

const PUBLISHED_ID = "0193a500-0000-7000-8000-00000000a001";
const DRAFT_ID = "0193a500-0000-7000-8000-00000000a003";

async function openSeaParcel(user: ReturnType<typeof userEvent.setup>) {
  renderWithProviders(<RatesAdmin />, { locale: "zh-CN" });
  await user.click(await screen.findByRole("button", { name: "查看 海运小包 v1" }));
  return screen.findByTestId("rate-version-panel");
}

describe("RatesAdmin", () => {
  let draftBody: unknown;
  let publishCall: { body: unknown; key: string | null } | null;

  beforeEach(() => {
    draftBody = null;
    publishCall = null;
    server.use(
      http.post(apiUrl("/admin/rate-cards/{rateCardId}/drafts"), async ({ request }) => {
        draftBody = await request.json();
        return HttpResponse.json(exampleFor({ operationId: "createRateDraft" }) as object, { status: 201 });
      }),
      http.post(apiUrl("/admin/rate-versions/{versionId}/publish"), async ({ request }) => {
        publishCall = { body: await request.json(), key: request.headers.get("Idempotency-Key") };
        return HttpResponse.json(exampleFor({ operationId: "publishRateVersion" }) as object);
      }),
    );
  });

  it("shows a published version read-only with its rates", async () => {
    const user = userEvent.setup();
    const panel = await openSeaParcel(user);
    expect(await within(panel).findByText("已发布版本只读。修改请基于它新建草稿。")).toBeInTheDocument();
    const akl = within(panel).getByLabelText("奥克兰 每 kg (NZD) 1");
    expect(akl).toHaveValue("2");
    expect(akl).toHaveAttribute("readonly");
    expect(within(panel).getByLabelText("清关费（按申报货值） 400–1,000")).toHaveValue("69.50");
  });

  it("creates a draft with only the edited rate changed", async () => {
    const user = userEvent.setup();
    const panel = await openSeaParcel(user);
    await user.click(await within(panel).findByRole("button", { name: "基于此版本新建草稿" }));
    const akl = within(panel).getByLabelText("奥克兰 每 kg (NZD) 1");
    await user.clear(akl);
    await user.type(akl, "2.20");
    await user.type(within(panel).getByLabelText("生效日期"), "2026-11-01");
    await user.click(within(panel).getByRole("button", { name: "创建草稿" }));

    // The parent re-keys the panel to the new draft, so query the new panel element.
    expect(await screen.findByText("已创建第 2 版草稿。")).toBeInTheDocument();
    const draftPanel = screen.getByTestId("rate-version-panel");
    const original = exampleFor({ operationId: "getRateVersion" }) as { payload: { regions: Record<string, unknown> } };
    expect(draftBody).toEqual({
      basedOnVersionId: PUBLISHED_ID,
      effectiveFrom: "2026-11-01",
      payload: { ...original.payload, regions: { ...original.payload.regions, AKL: { tiers: [{ fromKg: "0", perKg: "2.20" }] } } },
    });
    expect(within(draftPanel).getByText("海运小包 · 第 2 版")).toBeInTheDocument();
    expect(within(draftPanel).getByRole("button", { name: "试算" })).toBeInTheDocument();
  });

  it("will not create a draft with a non-numeric rate or without a date", async () => {
    const user = userEvent.setup();
    const panel = await openSeaParcel(user);
    await user.click(await within(panel).findByRole("button", { name: "基于此版本新建草稿" }));
    await user.click(within(panel).getByRole("button", { name: "创建草稿" }));
    expect(within(panel).getByText("请选择生效日期。")).toBeInTheDocument();

    const akl = within(panel).getByLabelText("奥克兰 每 kg (NZD) 1");
    await user.clear(akl);
    await user.type(akl, "2,2");
    await user.type(within(panel).getByLabelText("生效日期"), "2026-11-01");
    await user.click(within(panel).getByRole("button", { name: "创建草稿" }));
    expect(within(panel).getByText("请输入数字，例如 2 或 69.50。")).toBeInTheDocument();
    expect(draftBody).toBeNull();
  });

  it("simulates a draft and publishes it only with a reason, sending an idempotency key", async () => {
    const user = userEvent.setup();
    server.use(http.get(apiUrl("/admin/rate-versions/{versionId}"), () => HttpResponse.json(exampleFor({ operationId: "createRateDraft" }) as object)));
    const panel = await openSeaParcel(user);

    await user.click(await within(panel).findByRole("button", { name: "试算" }));
    const sim = await within(panel).findByTestId("simulation");
    expect(within(sim).getByText("上涨 1 · 下降 0 · 不变 1")).toBeInTheDocument();
    const firstRow = within(sim).getAllByRole("row")[1];
    expect(within(firstRow).getAllByRole("cell").slice(3).map((c) => nbsp(c.textContent))).toEqual(["NZD 26.00", "NZD 27.40", "NZD 1.40"]);

    await user.click(within(panel).getByRole("button", { name: "发布" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "确认发布" }));
    expect(within(dialog).getByText("请填写原因（至少 3 个字）。")).toBeInTheDocument();
    expect(publishCall).toBeNull();

    await user.type(within(dialog).getByLabelText("发布原因"), "11 月奥克兰调价");
    await user.click(within(dialog).getByRole("button", { name: "确认发布" }));
    expect(await within(panel).findByRole("status")).toHaveTextContent("已发布第 2 版，2026-11-01 起生效。");
    expect(publishCall?.body).toEqual({ reason: "11 月奥克兰调价" });
    expect(publishCall?.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(DRAFT_ID).toBe((exampleFor({ operationId: "publishRateVersion" }) as { id: string }).id);
  });

  it("tells a non-admin they cannot manage rates", async () => {
    server.use(http.get(apiUrl("/admin/rate-cards"), () =>
      HttpResponse.json({ type: "about:blank", title: "Forbidden", status: 403, code: "FORBIDDEN" }, { status: 403 })));
    renderWithProviders(<RatesAdmin />, { locale: "zh-CN" });
    expect(await screen.findByRole("alert")).toHaveTextContent("你的账号没有价格管理权限。");
  });
});
