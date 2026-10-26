import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { apiUrl, exampleFor, spyOn } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { normalizeSpaces as nbsp } from "@/test/text";
import { Payments } from "./payments";
import { ReceivableDetail } from "./receivable-detail";
import { Reconciliation } from "./reconciliation";
import { ReleaseOverrides } from "./release-overrides";

const zh = { locale: "zh-CN" as const };
const R1 = "0193a800-0000-7000-8000-000000000001";
const R2 = "0193a800-0000-7000-8000-000000000002";

describe("ReceivableDetail", () => {
  it("shows the snapshot's lines, tax codes and totals verbatim, then issues the invoice", async () => {
    const user = userEvent.setup();
    const issue = spyOn({ operationId: "issueInvoice" });
    server.use(issue.handler);
    renderWithProviders(<ReceivableDetail id={R1} />, zh);
    const lines = within(await screen.findByTestId("receivable-lines")).getAllByRole("row");
    expect(nbsp(lines[1].textContent ?? "")).toBe("海运费（9.5 kg）NZD 19.00ZERO0%NZD 0.00");
    expect(nbsp(screen.getByTestId("receivable-balance").textContent ?? "")).toBe("NZD 55.80");

    await user.click(screen.getByRole("button", { name: "开具税务发票" }));
    expect(await within(screen.getByTestId("invoices")).findByRole("link", { name: "INV-2026-000003" })).toBeInTheDocument();
    expect(issue.calls[0].headers.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.queryByRole("button", { name: "开具税务发票" })).toBeNull();
  });

  it("voids and reissues an invoice with a reason, keeping the original as void", async () => {
    const user = userEvent.setup();
    const reissue = spyOn({ operationId: "voidAndReissueInvoice" });
    server.use(reissue.handler);
    renderWithProviders(<ReceivableDetail id={R2} />, zh);
    await user.click(await screen.findByRole("button", { name: "作废重开" }));
    await user.type(within(screen.getByRole("dialog")).getByLabelText("原因（记入审计日志）"), "开票抬头写错");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "作废重开" }));
    const invoices = await screen.findByTestId("invoices");
    await within(invoices).findByRole("link", { name: "INV-2026-000004" });
    expect(within(invoices).getAllByRole("listitem").map((li) => li.textContent?.includes("已作废"))).toEqual([true, false]);
    expect(reissue.calls[0].body).toEqual({ reason: "开票抬头写错" });
  });

  it("asks for an admin-approved release when the shipment is not fully paid", async () => {
    const user = userEvent.setup();
    const override = spyOn({ operationId: "requestReleaseOverride" });
    server.use(override.handler);
    renderWithProviders(<ReceivableDetail id={R1} />, zh);
    await user.click(await screen.findByRole("button", { name: "申请审批" }));
    await user.type(within(screen.getByRole("dialog")).getByLabelText("原因（记入审计日志）"), "银行手续费少转");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "申请审批" }));
    expect(await screen.findByRole("status")).toHaveTextContent("已提交审批。");
    expect(screen.getByText("待审批")).toBeInTheDocument();
    expect(override.calls[0].body).toEqual({ reason: "银行手续费少转" });
  });
});

describe("Payments", () => {
  it("records the amount as typed (padded to cents) with the uploaded evidence", async () => {
    const user = userEvent.setup();
    const record = spyOn({ operationId: "recordPayment" });
    const upload = spyOn({ operationId: "createUploadUrl" });
    server.use(record.handler, upload.handler);
    renderWithProviders(<Payments />, zh);
    const form = await screen.findByTestId("record-payment");
    await user.click(within(form).getByRole("button", { name: "登记收款" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("请填写金额");
    expect(record.calls).toEqual([]);

    await user.type(within(form).getByLabelText("金额"), "55.8");
    await user.type(within(form).getByLabelText("参考号"), "R2610-0001");
    await user.type(within(form).getByLabelText("到账日期"), "2026-10-27");
    await user.upload(within(form).getByLabelText("凭据"), new File(["png"], "slip.png", { type: "image/png" }));
    await user.click(within(form).getByRole("button", { name: "登记收款" }));
    await vi.waitFor(() => expect(record.calls).toHaveLength(1));
    expect(upload.calls[0].body).toEqual({ purpose: "payment_evidence", contentType: "image/png", sizeBytes: 3 });
    expect(record.calls[0].body).toEqual({
      amount: "55.80", currency: "NZD", method: "bank_transfer", reference: "R2610-0001", receivedAt: "2026-10-27",
      evidenceFileId: "0193a5f0-8888-7000-8000-000000000001",
    });
  });

  it("allocates to open receivables only, sending the amounts as typed", async () => {
    const user = userEvent.setup();
    const allocate = spyOn({ operationId: "allocatePayment" });
    const listed = exampleFor({ operationId: "listReceivables" }) as { receivableNo: string; status: string }[];
    // A voided receivable can still show a balance; it must not be offered.
    const voided = { ...listed[0], id: "0193a800-0000-7000-8000-000000000009", receivableNo: "R2610-0009", status: "void" };
    server.use(allocate.handler, http.get(apiUrl("/finance/receivables"), () => HttpResponse.json([...listed, voided])));
    renderWithProviders(<Payments />, zh);
    await screen.findByText("PAY-2610-0009");
    const rows = within(screen.getByTestId("payments")).getAllByRole("row");
    await user.click(within(rows[1]).getByRole("button", { name: "分配" }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByLabelText("R2610-0001 分配金额");
    expect(within(dialog).queryByLabelText("R2610-0002 分配金额")).toBeNull();
    expect(within(dialog).queryByLabelText("R2610-0009 分配金额")).toBeNull();
    expect(within(dialog).getByLabelText("R2610-0003 分配金额")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("R2610-0001 分配金额"), "55.8");
    await user.click(within(dialog).getByRole("button", { name: "分配" }));
    await vi.waitFor(() => expect(allocate.calls).toHaveLength(1));
    expect(allocate.calls[0].body).toEqual({
      paymentId: "0193a810-0000-7000-8000-000000000009", allocations: [{ receivableId: R1, amount: "55.80" }],
    });
  });

  it("reverses a payment only with a reason and shows it reversed", async () => {
    const user = userEvent.setup();
    const reverse = spyOn({ operationId: "reversePayment" });
    server.use(reverse.handler);
    renderWithProviders(<Payments />, zh);
    await screen.findByText("PAY-2610-0009");
    const rows = within(screen.getByTestId("payments")).getAllByRole("row");
    await user.click(within(rows[1]).getByRole("button", { name: "冲销" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "冲销" }));
    expect(reverse.calls).toEqual([]);
    await user.type(within(screen.getByRole("dialog")).getByLabelText("原因（记入审计日志）"), "录错金额");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "冲销" }));
    await within(within(screen.getByTestId("payments")).getAllByRole("row")[1]).findByText("已冲销");
    expect(reverse.calls[0].body).toEqual({ reason: "录错金额" });
  });
});

describe("ReleaseOverrides", () => {
  it("lets an admin approve a pending release", async () => {
    const user = userEvent.setup();
    const approve = spyOn({ operationId: "approveReleaseOverride" });
    server.use(approve.handler);
    renderWithProviders(<ReleaseOverrides />, zh);
    await user.click(await screen.findByRole("button", { name: "批准" }));
    await within(screen.getByTestId("overrides")).findByText("已批准");
    expect(approve.calls).toHaveLength(1);
  });
});

describe("Reconciliation", () => {
  it("shows each row's match result and the Xero sync failures", async () => {
    renderWithProviders(<Reconciliation />, zh);
    const rows = within(await screen.findByTestId("reconciliation")).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.lastElementChild?.textContent)).toEqual(["一致", "Xero 缺失", "平台未登记", "金额不一致"]);
    expect(screen.getByTestId("xero-sync")).toHaveTextContent("1 条失败");
  });
});
