import "fake-indexeddb/auto";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiUrl, exampleFor, spyOn } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { ConsolidationJob } from "./consolidation-job";
import { DispatchQueue } from "./dispatch-queue";
import { ParcelDetail } from "./parcel-detail";
import { ReceiveStation } from "./receive-station";

// Image decoding is a browser API jsdom lacks; the queue, upload URL and Storage PUT below are real (MSW).
vi.mock("@/lib/photos/compress", () => ({ compressPhoto: async () => new Blob(["webp"], { type: "image/webp" }) }));
const print = vi.hoisted(() => vi.fn());
vi.mock("@/lib/print", () => ({ printPage: print }));
globalThis.URL.createObjectURL ??= () => "blob:test";
globalThis.URL.revokeObjectURL ??= () => {};

const zh = { locale: "zh-CN" as const };

async function fillMeasurements(user: ReturnType<typeof userEvent.setup>, values = ["4.2", "40", "30", "25"]) {
  for (const [label, value] of [["重量 kg", values[0]], ["长 cm", values[1]], ["宽 cm", values[2]], ["高 cm", values[3]]]) {
    await user.clear(screen.getByLabelText(label));
    await user.type(screen.getByLabelText(label), value);
  }
}

describe("ReceiveStation", () => {
  beforeEach(() => print.mockReset());

  it("receives a matched parcel only once it is measured and a photo is uploaded, then prints its label", async () => {
    const user = userEvent.setup();
    const receive = spyOn({ operationId: "receiveParcel" });
    server.use(receive.handler);
    renderWithProviders(<ReceiveStation />, zh);

    await user.type(screen.getByLabelText("扫描快递面单或唛头"), "SF1234567890123{Enter}");
    expect(await screen.findByTestId("scan-result")).toHaveTextContent("已匹配预报");
    expect(screen.getByLabelText("快递单号")).toHaveValue("SF1234567890123");

    await fillMeasurements(user);
    await user.click(screen.getByRole("button", { name: "确认入库" }));
    expect(screen.getByRole("alert")).toHaveTextContent("至少拍一张照片");
    expect(receive.calls).toEqual([]);

    await user.upload(screen.getByLabelText("拍照"), new File(["jpeg"], "box.jpg", { type: "image/jpeg" }));
    await vi.waitFor(() => expect(within(screen.getByTestId("photo-strip")).getByText("已上传")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "确认入库" }));

    expect(await screen.findByRole("status")).toHaveTextContent("已入库，包裹号 P2610-000125");
    expect(screen.getByTestId("parcel-label")).toHaveTextContent("P2610-000125");
    expect(print).toHaveBeenCalledTimes(1);
    expect(receive.calls).toHaveLength(1);
    expect(receive.calls[0].body).toMatchObject({
      scanCode: "SF1234567890123", preNoticeId: "0193a5d0-3333-7000-8000-000000000001", memberNo: "CE-123456-7",
      carrier: "SF", trackingNo: "SF1234567890123", pieceNo: null, condition: "OK", damageNote: null,
      measurements: { weightKg: "4.2", lengthCm: "40", widthCm: "30", heightCm: "25" },
      photoFileIds: ["0193a5f0-8888-7000-8000-000000000001"],
    });
    expect(receive.calls[0].headers.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("offers no form for a parcel that was already received", async () => {
    const user = userEvent.setup();
    server.use(http.post(apiUrl("/wh/parcels/scan"), () => HttpResponse.json(exampleFor({ operationId: "scanParcel", example: "duplicate" }) as object)));
    renderWithProviders(<ReceiveStation />, zh);
    await user.type(screen.getByLabelText("扫描快递面单或唛头"), "SF1234567890123{Enter}");
    expect(await screen.findByTestId("scan-result")).toHaveTextContent("已经入库过，不要重复入库");
    expect(screen.getByRole("link", { name: "P2610-000125" })).toHaveAttribute("href", "/staff/warehouse/parcels/0193a5f0-6666-7000-8000-000000000125");
    expect(screen.queryByRole("button", { name: "确认入库" })).toBeNull();
  });
});

describe("ParcelDetail", () => {
  const ID = "0193a5f0-6666-7000-8000-000000000125";

  it("corrects measurements only with a reason, keeping the old values in the history", async () => {
    const user = userEvent.setup();
    const correct = spyOn({ operationId: "correctMeasurements" });
    server.use(correct.handler);
    renderWithProviders(<ParcelDetail id={ID} />, zh);
    await user.click(await screen.findByRole("button", { name: "更正测量" }));
    await fillMeasurements(user, ["4.6", "40", "30", "25"]);
    await user.click(screen.getByRole("button", { name: "保存更正" }));
    expect(screen.getByText("请填写四项测量值并写明原因（至少 3 个字）。")).toBeInTheDocument();
    expect(correct.calls).toEqual([]);

    await user.type(screen.getByLabelText("原因"), "复称：第一次称重时箱子没放稳");
    await user.click(screen.getByRole("button", { name: "保存更正" }));
    expect(await screen.findByTestId("measurement-history")).toHaveTextContent("4.2 kg");
    expect(screen.getByTestId("current-measurements")).toHaveTextContent("4.6 kg");
    expect(correct.calls[0].body).toEqual({
      measurements: { weightKg: "4.6", lengthCm: "40", widthCm: "30", heightCm: "25" }, reason: "复称：第一次称重时箱子没放稳", expectedVersion: 1,
    });
  });

  it("puts a parcel on hold with the chosen type and reason", async () => {
    const user = userEvent.setup();
    const hold = spyOn({ operationId: "holdParcel" });
    server.use(hold.handler);
    renderWithProviders(<ParcelDetail id={ID} />, zh);
    await user.selectOptions(await screen.findByLabelText("扣留类型"), "PROHIBITED");
    await user.click(screen.getByRole("button", { name: "扣留" }));
    await user.type(within(screen.getByRole("dialog")).getByLabelText("原因（记入审计日志）"), "疑似电池");
    await user.click(screen.getByRole("button", { name: "确认扣留" }));
    expect(await screen.findByText("已扣留，等待运营处理。")).toBeInTheDocument();
    expect(hold.calls[0].body).toEqual({ kind: "PROHIBITED", reason: "疑似电池", expectedVersion: 1 });
  });
});

describe("ConsolidationJob", () => {
  it("starts the job, then completes it only when every parcel is packed and measured", async () => {
    const user = userEvent.setup();
    const complete = spyOn({ operationId: "completeConsolidation" });
    server.use(complete.handler);
    renderWithProviders(<ConsolidationJob id="0193a700-0000-7000-8000-000000000007" />, zh);
    await user.click(await screen.findByRole("button", { name: "开始作业" }));

    const carton = await screen.findByTestId("output-1");
    await user.click(within(carton).getByRole("checkbox", { name: "P2610-000124" }));
    await fillMeasurements(user, ["5.6", "40", "30", "25"]);
    await user.type(screen.getByLabelText("合并操作费"), "1");
    await user.type(screen.getByLabelText("纸箱"), "1");
    await user.click(screen.getByRole("button", { name: "完成作业" }));
    expect(screen.getByRole("alert")).toHaveTextContent("把每件包裹放进纸箱");
    expect(complete.calls).toEqual([]);

    await user.click(within(carton).getByRole("checkbox", { name: "P2610-000124" }));
    await user.click(screen.getByRole("button", { name: "完成作业" }));
    expect(await screen.findByTestId("job-outputs")).toHaveTextContent("B2610-000040");
    expect(complete.calls[0].body).toEqual({
      expectedVersion: 2,
      packages: [{ measurements: { weightKg: "5.6", lengthCm: "40", widthCm: "30", heightCm: "25" },
        sourceParcelIds: ["0193a5f0-6666-7000-8000-000000000123", "0193a5f0-6666-7000-8000-000000000124"] }],
      charges: [{ code: "HANDLING", qty: 1 }, { code: "CARTON", qty: 1 }],
    });
  });
});

describe("DispatchQueue", () => {
  it("marks the selected shipment dispatched with the version shown", async () => {
    const user = userEvent.setup();
    const transition = spyOn({ operationId: "transitionShipment" });
    server.use(transition.handler);
    renderWithProviders(<DispatchQueue />, zh);
    await user.click(await screen.findByRole("checkbox", { name: "选择 CE-S2610-0011" }));
    await user.click(screen.getByRole("button", { name: "将 1 票标记为已发运" }));
    expect(await screen.findByRole("status")).toHaveTextContent("已发运：CE-S2610-0011");
    expect(transition.calls.map((c) => c.body)).toEqual([{ to: "dispatched", expectedVersion: 5, reason: null }]);
    expect(within(screen.getByTestId("dispatch")).getAllByRole("row")).toHaveLength(2);
  });
});
