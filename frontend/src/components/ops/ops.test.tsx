import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { apiUrl, spyOn } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { AssignUnclaimed } from "./assign-unclaimed";
import { DeliveryLog } from "./delivery-log";
import { LeadFunnel } from "./lead-funnel";
import { OpsCustomer } from "./ops-customer";
import { OpsDashboard } from "./ops-dashboard";
import { OpsShipment } from "./ops-shipment";
import { PriceAdjustments } from "./price-adjustments";

const zh = { locale: "zh-CN" as const };
const S2 = "0193a5e0-5555-7000-8000-000000000002";
const S1 = "0193a5e0-5555-7000-8000-000000000001";

describe("OpsDashboard", () => {
  it("shows the API's counts and links each exception to where it is handled", async () => {
    renderWithProviders(<OpsDashboard />, zh);
    const parcels = await screen.findByTestId("counts-parcel");
    expect(within(parcels).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["无主2", "扣留1", "待选择处理方式7"]);
    const links = within(screen.getByTestId("exceptions")).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["CE-S2610-0002", `/staff/ops/shipments/${S2}`],
      ["P2610-000125", "/staff/warehouse/parcels/0193a5f0-6666-7000-8000-000000000125"],
      ["P2610-000132", "/staff/ops/unclaimed"],
    ]);
  });
});

describe("OpsShipment", () => {
  it("rolls back only with a reason, and moves forward without one", async () => {
    const user = userEvent.setup();
    const transition = spyOn({ operationId: "transitionShipment" });
    server.use(transition.handler);
    renderWithProviders(<OpsShipment id={S2} />, zh);

    await user.click(await screen.findByRole("button", { name: "回退到：清关中" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "确认" }));
    expect(transition.calls).toEqual([]);
    await user.type(within(dialog).getByLabelText("原因（记入审计日志）"), "海关已放行，误点扣留");
    await user.click(within(dialog).getByRole("button", { name: "确认" }));
    await screen.findByText("状态已更新为：派送中。");

    await user.click(screen.getByRole("button", { name: "推进到：派送中" }));
    await vi.waitFor(() => expect(transition.calls).toHaveLength(2));
    expect(transition.calls.map((c) => c.body)).toEqual([
      { to: "customs_clearing", expectedVersion: 9, reason: "海关已放行，误点扣留" },
      { to: "out_for_delivery", expectedVersion: 9, reason: null },
    ]);
  });

  it("adds an internal note to the top of the list", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OpsShipment id={S2} />, zh);
    await user.type(await screen.findByLabelText("添加内部备注（客户看不到）"), "客户已发来发票，转交报关行。");
    await user.click(screen.getByRole("button", { name: "添加备注" }));
    const notes = await screen.findByTestId("notes");
    await vi.waitFor(() => expect(within(notes).getAllByRole("listitem")).toHaveLength(2));
    expect(within(notes).getAllByRole("listitem")[0]).toHaveTextContent("客户已发来发票，转交报关行。");
  });

  it("requests a price adjustment with only the changed line, as typed", async () => {
    const user = userEvent.setup();
    const request = spyOn({ operationId: "requestPriceAdjustment" });
    server.use(request.handler);
    renderWithProviders(<OpsShipment id={S1} />, zh);
    await user.click(await screen.findByRole("button", { name: "申请调价" }));
    await user.click(screen.getByRole("button", { name: "提交审批" }));
    expect(screen.getByRole("alert")).toHaveTextContent("请至少修改一项金额。");

    await user.clear(screen.getByLabelText("纸箱费 的新金额"));
    await user.type(screen.getByLabelText("纸箱费 的新金额"), "0");
    await user.type(screen.getByLabelText("原因"), "破损件重新打包，免收纸箱费");
    await user.click(screen.getByRole("button", { name: "提交审批" }));
    expect(await screen.findByRole("status")).toHaveTextContent("已提交调价申请");
    expect(request.calls[0].body).toEqual({ shipmentId: S1, reason: "破损件重新打包，免收纸箱费", lines: [{ code: "CARTON", after: "0.00" }] });
  });
});

describe("PriceAdjustments", () => {
  it("lets an admin approve a pending request", async () => {
    const user = userEvent.setup();
    const approve = spyOn({ operationId: "approvePriceAdjustment" });
    server.use(approve.handler);
    renderWithProviders(<PriceAdjustments />, zh);
    await user.click(await screen.findByRole("button", { name: "批准" }));
    const row = within(screen.getByTestId("adjustments")).getAllByRole("row")[1];
    await within(row).findByText("已批准");
    expect(approve.calls[0].body).toEqual({ note: null });
  });

  it("shows no approve or reject to someone who is not an admin", async () => {
    server.use(http.get(apiUrl("/staff/me"), () => HttpResponse.json({ id: "0193a510-0000-7000-8000-00000000f009", name: "运营", email: "o@x.nz", roles: ["nz_ops"] })));
    renderWithProviders(<PriceAdjustments />, zh);
    await screen.findByText("破损件重新打包，免收纸箱费");
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("button", { name: "批准" })).toBeNull();
  });
});

describe("AssignUnclaimed", () => {
  it("assigns a parcel only with a valid member number and how it was matched", async () => {
    const user = userEvent.setup();
    const assign = spyOn({ operationId: "assignParcel" });
    server.use(assign.handler);
    renderWithProviders(<AssignUnclaimed />, zh);
    const rows = within(await screen.findByTestId("unclaimed")).getAllByRole("row");
    await user.click(within(rows[1]).getByRole("button", { name: "指派" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("会员号"), "123456");
    await user.click(within(dialog).getByRole("button", { name: "确认指派" }));
    expect(within(dialog).getByText("请填写会员号（如 CE-123456-7）和核对方式。")).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText("会员号"));
    await user.type(within(dialog).getByLabelText("会员号"), "ce-123456-7");
    await user.type(within(dialog).getByLabelText("核对方式"), "客户发来单号 YT5544332211");
    await user.click(within(dialog).getByRole("button", { name: "确认指派" }));
    expect(await screen.findByRole("status")).toHaveTextContent("P2610-000131 已指派给 CE-123456-7。");
    expect(assign.calls[0].body).toEqual({ memberNo: "CE-123456-7", preNoticeId: null, reason: "客户发来单号 YT5544332211" });
  });
});

describe("LeadFunnel", () => {
  it("shows each stage as a count and a share of the source's visits", async () => {
    renderWithProviders(<LeadFunnel />, zh);
    const row = within(await screen.findByTestId("funnel")).getAllByRole("row")[1];
    expect(within(row).getAllByRole("cell").map((c) => c.textContent)).toEqual(["fb-marketplace", "412", "9623%", "7117%", "236%", "92%"]);
  });
});

describe("DeliveryLog", () => {
  it("sends a failed notification again and shows it queued", async () => {
    const user = userEvent.setup();
    const resend = spyOn({ operationId: "resendNotification" });
    server.use(resend.handler);
    renderWithProviders(<DeliveryLog />, zh);
    await user.click(await screen.findByRole("button", { name: "重发" }));
    const row = within(screen.getByTestId("deliveries")).getAllByRole("row")[1];
    await within(row).findByText("排队中");
    expect(resend.calls[0].headers.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("OpsCustomer", () => {
  it("offers a merge only into a different, valid member number, with a reason", async () => {
    const user = userEvent.setup();
    const merge = spyOn({ operationId: "mergeCustomer" });
    server.use(merge.handler);
    renderWithProviders(<OpsCustomer id="0193a5b2-7c41-7e10-9d2e-4f1a2b3c4d5e" />, zh);
    const target = await screen.findByLabelText("保留的会员号");
    await user.type(target, "CE-123456-7");
    expect(screen.queryByRole("button", { name: "合并" })).toBeNull();
    await user.clear(target);
    await user.type(target, "CE-204518-3");
    await user.click(screen.getByRole("button", { name: "合并" }));
    await user.type(within(screen.getByRole("dialog")).getByLabelText("原因（记入审计日志）"), "同一客户两个邮箱，已电话核实");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "合并" }));
    expect(await screen.findByText("已合并到 CE-204518-3。")).toBeInTheDocument();
    expect(merge.calls[0].body).toEqual({ intoMemberNo: "CE-204518-3", reason: "同一客户两个邮箱，已电话核实" });
  });
});
