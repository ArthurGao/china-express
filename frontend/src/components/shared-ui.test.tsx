import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { JourneyProgress } from "./journey-progress";
import { ReasonDialog } from "./reason-dialog";
import { StatusBadge } from "./status-badge";

describe("ReasonDialog", () => {
  it("sends nothing until a reason is given, then sends it trimmed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithProviders(<ReasonDialog trigger="回退" title="回退到待付款" confirmLabel="确认回退" onConfirm={onConfirm} />, { locale: "zh-CN" });
    await user.click(screen.getByRole("button", { name: "回退" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "确认回退" }));
    expect(within(dialog).getByText("请填写原因（至少 3 个字）。")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("原因（记入审计日志）"), "  重量录错  ");
    await user.click(within(dialog).getByRole("button", { name: "确认回退" }));
    expect(onConfirm).toHaveBeenCalledWith("重量录错");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("JourneyProgress", () => {
  it("marks the API's step as current and shows an exception on it", () => {
    renderWithProviders(<JourneyProgress step={6} exception="CUSTOMS_HELD" />);
    const steps = screen.getByRole("list", { name: "Step 6 of 7" }).querySelectorAll("li");
    expect([...steps].map((li) => li.getAttribute("aria-current"))).toEqual([null, null, null, null, null, "step", null]);
    expect(screen.getByRole("status")).toHaveTextContent("Held by NZ Customs");
    expect(screen.getByRole("status").parentElement).toHaveTextContent("06Arrived in NZHeld by NZ Customs");
  });
});

describe("StatusBadge", () => {
  it("labels the API status in the page language and tones it by meaning", () => {
    renderWithProviders(<><StatusBadge group="shipment" value="customs_held" /><StatusBadge group="receivable" value="paid" /></>, { locale: "zh-CN" });
    expect(screen.getByText("海关扣留")).toHaveClass("text-warning");
    expect(screen.getByText("已付清")).toHaveClass("text-success");
  });
});
