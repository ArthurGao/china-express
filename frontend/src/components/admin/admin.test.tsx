import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { spyOn } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { normalizeSpaces as nbsp } from "@/test/text";
import { AuditLog } from "./audit-log";
import { FclRates } from "./fcl-rates";
import { Reports } from "./reports";
import { StaffAdmin } from "./staff-admin";

const zh = { locale: "zh-CN" as const };

describe("StaffAdmin", () => {
  it("invites only with a name, a valid email and at least one role", async () => {
    const user = userEvent.setup();
    const invite = spyOn({ operationId: "inviteStaff" });
    server.use(invite.handler);
    renderWithProviders(<StaffAdmin />, zh);
    const form = await screen.findByTestId("invite");
    await user.type(within(form).getByLabelText("姓名"), "刘新");
    await user.type(within(form).getByLabelText("邮箱"), "wh2@chinaexpress.example");
    await user.click(within(form).getByRole("button", { name: "发送邀请" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("至少选一个角色");
    expect(invite.calls).toEqual([]);

    await user.click(within(form).getByRole("checkbox", { name: "仓库" }));
    await user.click(within(form).getByRole("button", { name: "发送邀请" }));
    expect(await within(form).findByRole("status")).toHaveTextContent("已向 wh2@chinaexpress.example 发送邀请。");
    expect(invite.calls[0].body).toEqual({ name: "刘新", email: "wh2@chinaexpress.example", roles: ["warehouse"] });
    await within(screen.getByTestId("staff")).findByText("刘新");
  });

  it("deactivates an account and shows it deactivated", async () => {
    const user = userEvent.setup();
    const update = spyOn({ operationId: "updateStaff" });
    server.use(update.handler);
    renderWithProviders(<StaffAdmin />, zh);
    await screen.findByText("陈仓");
    const row = () => within(screen.getByTestId("staff")).getAllByRole("row")[2];
    await user.click(within(row()).getByRole("button", { name: "停用" }));
    await within(row()).findByText("已停用");
    expect(update.calls[0].body).toEqual({ status: "inactive" });
  });

  it("adds a role to what the person already has", async () => {
    const user = userEvent.setup();
    const update = spyOn({ operationId: "updateStaff" });
    server.use(update.handler);
    renderWithProviders(<StaffAdmin />, zh);
    await user.click(await screen.findByRole("checkbox", { name: "林晓 的仓库角色" }));
    await vi.waitFor(() => expect(update.calls).toHaveLength(1));
    expect(update.calls[0].body).toEqual({ roles: ["admin", "nz_ops", "warehouse"] });
  });
});

describe("AuditLog", () => {
  it("lists who changed what, before and after, with the reason", async () => {
    renderWithProviders(<AuditLog />, zh);
    await screen.findByText("parcel.measurements_corrected");
    const first = within(screen.getByTestId("audit")).getAllByRole("row")[1];
    expect(within(first).getAllByRole("cell").slice(1).map((c) => c.textContent)).toEqual([
      "陈仓", "parcel.measurements_corrected", "P2610-000125", "weightKg: 4.2", "weightKg: 4.6", "复称：第一次称重时箱子没放稳",
    ]);
  });
});

describe("FclRates", () => {
  it("warns that the published sheet expired and publishes a draft with a reason", async () => {
    const user = userEvent.setup();
    const publish = spyOn({ operationId: "publishFclRateSheet" });
    server.use(publish.handler);
    renderWithProviders(<FclRates />, zh);
    expect(await screen.findByRole("alert")).toHaveTextContent("已发布的运价已于 2026-10-14 过期");
    expect(nbsp(within(screen.getByTestId("fcl-rates")).getAllByRole("row")[1].textContent ?? "")).toBe("ShanghaiAucklandUSD 2,900.00USD 5,800.00");
    await user.click(screen.getByRole("button", { name: "发布" }));
    await user.type(within(screen.getByRole("dialog")).getByLabelText("原因（记入审计日志）"), "11 月整柜运价");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "发布" }));
    await vi.waitFor(() => expect(publish.calls).toHaveLength(1));
    expect(publish.calls[0].body).toEqual({ reason: "11 月整柜运价" });
    await within(screen.getByTestId("fcl-sheets")).findAllByText("已发布");
  });

  it("imports a sheet as a draft after uploading the file", async () => {
    const user = userEvent.setup();
    const upload = spyOn({ operationId: "createUploadUrl" });
    const importSheet = spyOn({ operationId: "importFclRateSheet" });
    server.use(upload.handler, importSheet.handler);
    renderWithProviders(<FclRates />, zh);
    const form = await screen.findByTestId("fcl-import");
    await user.click(within(form).getByRole("button", { name: "导入为草稿" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("请选择文件并填写两个日期。");
    await user.upload(within(form).getByLabelText("运价表（.xlsx 或 .csv）"), new File(["a,b"], "FCL-2026-11.csv", { type: "text/csv" }));
    await user.type(within(form).getByLabelText("生效日期"), "2026-11-01");
    await user.type(within(form).getByLabelText("截止日期"), "2026-11-30");
    await user.click(within(form).getByRole("button", { name: "导入为草稿" }));
    await vi.waitFor(() => expect(importSheet.calls).toHaveLength(1));
    expect(upload.calls[0].body).toMatchObject({ purpose: "fcl_rate_sheet", contentType: "text/csv" });
    expect(importSheet.calls[0].body).toEqual({ fileId: "0193a5f0-8888-7000-8000-000000000001", validFrom: "2026-11-01", validTo: "2026-11-30" });
  });
});

describe("Reports", () => {
  it("keeps NZD and USD revenue apart and explains why profit is missing", async () => {
    renderWithProviders(<Reports />, zh);
    const rows = within(await screen.findByTestId("revenue")).getAllByRole("row").slice(1);
    expect(rows.map((r) => nbsp(r.textContent ?? ""))).toEqual(["2026-08NZD 8,420.50", "2026-09NZD 12,960.00", "2026-10NZD 15,318.75", "2026-10USD 6,000.00"]);
    expect(screen.getByRole("note")).toHaveTextContent("业主确认成本和分摊规则后才显示利润。");
  });
});
