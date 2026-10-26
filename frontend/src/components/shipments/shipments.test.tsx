import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiUrl, exampleFor, spyOn } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { normalizeSpaces as nbsp } from "@/test/text";
import { HandlingChoice } from "./handling-choice";
import { ShipmentList } from "./shipment-list";
import { ShipmentView } from "./shipment-view";

const navigate = vi.hoisted(() => vi.fn());
vi.mock("@/lib/navigation", () => ({ hardNavigate: navigate }));

const S1 = "0193a5e0-5555-7000-8000-000000000001";
const P2 = "0193a5d0-3333-7000-8000-000000000002";

describe("ShipmentList", () => {
  it("links pre-notices to their notice page and shipments to their detail, with the API's next action", async () => {
    renderWithProviders(<ShipmentList />);
    const items = within(await screen.findByTestId("shipment-list")).getAllByRole("link");
    expect(items.map((a) => a.getAttribute("href"))).toEqual([
      `/pre-notice/${P2}`, `/shipments/${S1}`, "/pre-notice/0193a5d0-3333-7000-8000-000000000001",
      "/shipments/0193a5e0-5555-7000-8000-000000000002", "/shipments/0193a5e0-5555-7000-8000-000000000003",
    ]);
    expect(items[0]).toHaveTextContent("Choose how to ship");
    expect(items[1]).toHaveTextContent("Confirm the final price");
    expect(items[3]).toHaveTextContent("Held by NZ Customs");
  });
});

describe("ShipmentView", () => {
  beforeEach(() => navigate.mockReset());

  it("shows estimate and final price exactly as priced by the backend, then confirms with the version seen", async () => {
    const user = userEvent.setup();
    const confirm = spyOn({ operationId: "confirmFinalPrice" });
    server.use(confirm.handler);
    renderWithProviders(<ShipmentView id={S1} />);

    const final = await screen.findByTestId("final-price");
    expect(nbsp(final.textContent ?? "")).toContain("NZD 51.00+GST");
    expect(nbsp(screen.getByTestId("estimate-price").textContent ?? "")).toContain("NZD 30.00+GST");
    expect(screen.queryByTestId("payment-panel")).toBeNull();
    // Sections are numbered in reading order, skipping the ones not shown (no payment yet).
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(
      ["01Your final price", "02Cartons shipped", "03Parcels we received", "04History"]);

    await user.click(screen.getByRole("button", { name: "Confirm final price" }));
    expect(nbsp((await screen.findByTestId("balance")).textContent ?? "")).toBe("NZD 55.80");
    expect(screen.getByTestId("bank-reference")).toHaveTextContent("R2610-0001");
    expect(screen.queryByRole("button", { name: "Confirm final price" })).toBeNull();
    expect(confirm.calls).toHaveLength(1);
    expect(confirm.calls[0].body).toEqual({ expectedVersion: 3 });
    expect(confirm.calls[0].headers.get("Idempotency-Key")).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("asks the customer to look again when the price changed meanwhile (409)", async () => {
    const user = userEvent.setup();
    server.use(http.post(apiUrl("/shipments/{shipmentId}/confirm-final"), () =>
      HttpResponse.json({ type: "about:blank", title: "Conflict", status: 409, code: "VERSION_CONFLICT" }, { status: 409 })));
    renderWithProviders(<ShipmentView id={S1} />);
    await user.click(await screen.findByRole("button", { name: "Confirm final price" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The price was updated while you were looking.");
  });

  it("sends the customer to the payment provider's page from the open receivable", async () => {
    const user = userEvent.setup();
    server.use(http.get(apiUrl("/shipments/{shipmentId}"), () => HttpResponse.json(exampleFor({ operationId: "confirmFinalPrice" }) as object)));
    renderWithProviders(<ShipmentView id={S1} />);
    await user.click(await screen.findByRole("button", { name: "Pay online" }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/payments/result?payment=0193a600-8888-7000-8000-000000000001"));
  });

  it("renders no tracking link for a URL that is not https (e.g. javascript:)", async () => {
    const held = exampleFor({ operationId: "getShipment", example: "customsHeld" }) as object;
    server.use(http.get(apiUrl("/shipments/{shipmentId}"), () => HttpResponse.json({ ...held, trackingUrl: "javascript:alert(document.cookie)" })));
    renderWithProviders(<ShipmentView id="0193a5e0-5555-7000-8000-000000000002" />);
    await screen.findByTestId("shipment-no");
    expect(screen.queryByRole("link", { name: "Track with the NZ courier" })).toBeNull();
    expect(document.querySelector('a[href^="javascript"]')).toBeNull();
  });

  it("does not follow a payment redirect that is not https or on this site", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(apiUrl("/shipments/{shipmentId}"), () => HttpResponse.json(exampleFor({ operationId: "confirmFinalPrice" }) as object)),
      http.post(apiUrl("/shipments/{shipmentId}/payments"), () =>
        HttpResponse.json({ paymentId: "0193a600-8888-7000-8000-000000000001", redirectUrl: "javascript:alert(1)" }, { status: 201 })),
    );
    renderWithProviders(<ShipmentView id={S1} />);
    await user.click(await screen.findByRole("button", { name: "Pay online" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We could not start the online payment.");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("offers no payment for a paid shipment and shows its invoice", async () => {
    renderWithProviders(<ShipmentView id="0193a5e0-5555-7000-8000-000000000003" />);
    expect(nbsp((await screen.findByTestId("balance")).textContent ?? "")).toBe("NZD 0.00");
    expect(screen.queryByText("Pay by bank transfer")).toBeNull();
    expect(screen.getByRole("link", { name: "INV-2026-000002" })).toHaveAttribute("href", "/demo/invoice.pdf");
  });
});

describe("HandlingChoice", () => {
  it("sends nothing until an option is picked, then sends the mode with the version seen", async () => {
    const user = userEvent.setup();
    const choose = spyOn({ operationId: "chooseHandling" });
    server.use(choose.handler);
    renderWithProviders(<HandlingChoice preNoticeId={P2} />);
    await user.click(await screen.findByRole("button", { name: "Confirm my choice" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please choose an option.");
    expect(choose.calls).toEqual([]);

    await user.click(screen.getByRole("radio", { name: /Combine into fewer cartons/ }));
    await user.click(screen.getByRole("button", { name: "Confirm my choice" }));
    expect(await screen.findByTestId("handling-chosen")).toHaveTextContent("You chose: Combine into fewer cartons.");
    expect(choose.calls[0].body).toEqual({ mode: "CONSOLIDATE", expectedVersion: 4 });
  });

  it("does not offer an option the backend disallows, and says why", async () => {
    const open = exampleFor({ operationId: "getPreNoticeHandling", example: "readyForChoice" }) as { options: { mode: string }[] };
    server.use(http.get(apiUrl("/pre-notices/{preNoticeId}/handling"), () => HttpResponse.json({
      ...open,
      options: open.options.map((o) => o.mode === "CONSOLIDATE_UNPACK"
        ? { ...o, allowed: false, reason: { en: "One parcel is over 25 kg.", zh: "有一件超过 25 kg。" } } : o),
    })));
    renderWithProviders(<HandlingChoice preNoticeId={P2} />);
    expect(await screen.findByRole("radio", { name: /Combine and remove original packaging/ })).toBeDisabled();
    expect(screen.getByText("One parcel is over 25 kg.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Ship each parcel as it is/ })).toBeEnabled();
  });
});
