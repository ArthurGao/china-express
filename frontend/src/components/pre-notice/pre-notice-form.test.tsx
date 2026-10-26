import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { spyOn } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { PreNoticeForm } from "./pre-notice-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));

const QUOTE_ID = "0193a5c0-1111-7000-8000-000000000001";

describe("PreNoticeForm", () => {
  let posts: ReturnType<typeof spyOn>["calls"];

  beforeEach(() => {
    push.mockReset();
    const spy = spyOn({ operationId: "createPreNotice" });
    posts = spy.calls;
    server.use(spy.handler);
  });

  it("cannot be sent without the prohibited-goods acknowledgement", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PreNoticeForm quoteId={QUOTE_ID} product="SEA_PARCEL" />);
    await screen.findByText("Your chosen option");
    await user.click(screen.getByRole("button", { name: "Send shipment notice" }));
    expect(await screen.findByText("Please confirm before sending the notice.")).toBeInTheDocument();
    expect(posts).toEqual([]);
  });

  it("sends the notice for the chosen option with the quote's destination, then opens it", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PreNoticeForm quoteId={QUOTE_ID} product="SEA_PARCEL" />);
    await screen.findByText("Your chosen option");
    await user.type(screen.getByLabelText("How many parcels are you expecting? (optional)"), "3");
    await user.type(screen.getByLabelText("Courier tracking numbers (optional)"), "SF1234567890123\n\nYT9988776655\nSF1234567890123");
    await user.click(screen.getByLabelText(/I confirm my shipment contains none/));
    await user.click(screen.getByRole("button", { name: "Send shipment notice" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/pre-notice/0193a5d0-3333-7000-8000-000000000001"));
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toEqual({
      estimateQuoteId: QUOTE_ID,
      product: "SEA_PARCEL",
      destination: { region: "AKL", cityId: "akl" },
      expectedParcels: 3,
      prohibitedGoodsAck: true,
      trackingNumbers: [
        { carrier: null, trackingNo: "SF1234567890123" },
        { carrier: null, trackingNo: "YT9988776655" },
      ],
    });
    expect(posts[0].headers.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("refuses a tracking number that is too short", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PreNoticeForm quoteId={QUOTE_ID} product="SEA_PARCEL" />);
    await screen.findByText("Your chosen option");
    await user.type(screen.getByLabelText("Courier tracking numbers (optional)"), "SF1");
    await user.click(screen.getByLabelText(/I confirm my shipment contains none/));
    await user.click(screen.getByRole("button", { name: "Send shipment notice" }));
    expect(await screen.findByText("Each tracking number needs 4 to 50 characters.")).toBeInTheDocument();
    expect(posts).toEqual([]);
  });

  it("sends people without a quote back to the quote page", () => {
    renderWithProviders(<PreNoticeForm quoteId={null} product={null} />);
    expect(screen.getByRole("link", { name: "Get a quote" })).toHaveAttribute("href", "/quote");
  });
});
