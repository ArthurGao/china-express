import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { spyOn } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { BillingEntities } from "./account/billing-entities";
import { NotificationPrefs } from "./account/notification-prefs";
import { NotificationList } from "./notifications/notification-list";
import { PaymentResult } from "./payments/payment-result";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("payment=0193a600-8888-7000-8000-000000000001") }));

describe("NotificationList", () => {
  it("marks exactly the unread notifications as read", async () => {
    const user = userEvent.setup();
    const read = spyOn({ operationId: "markNotificationsRead" });
    server.use(read.handler);
    renderWithProviders(<NotificationList />);
    const items = within(await screen.findByTestId("notification-list")).getAllByRole("listitem");
    expect(items.map((li) => li.hasAttribute("data-unread"))).toEqual([true, true, false]);
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    await vi.waitFor(() => expect(read.calls).toHaveLength(1));
    expect(read.calls[0].body).toEqual({ ids: ["0193a610-9999-7000-8000-000000000001", "0193a610-9999-7000-8000-000000000002"] });
  });
});

describe("BillingEntities", () => {
  it("refuses an incomplete entry and sends a complete company entry", async () => {
    const user = userEvent.setup();
    const create = spyOn({ operationId: "createBillingEntity" });
    server.use(create.handler);
    renderWithProviders(<BillingEntities />);
    await user.click(await screen.findByRole("button", { name: "Add invoice details" }));
    await user.click(screen.getByRole("radio", { name: "Company" }));
    await user.type(screen.getByLabelText("Full or legal name"), "Chen Trading Limited");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Please fill in the name and a full address with a 4-digit postcode.")).toBeInTheDocument();
    expect(create.calls).toEqual([]);

    await user.type(screen.getByLabelText("GST number"), "123-456-789");
    await user.type(screen.getByLabelText("Street address"), "5 Customs Street");
    await user.type(screen.getByLabelText("City or town"), "Auckland");
    await user.type(screen.getByLabelText("Postcode"), "1010");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(create.calls).toHaveLength(1));
    expect(create.calls[0].body).toEqual({
      type: "company", legalName: "Chen Trading Limited", gstNumber: "123-456-789",
      address: { line1: "5 Customs Street", line2: null, city: "Auckland", postcode: "1010" },
    });
    expect(within(screen.getByTestId("billing-entities")).getAllByRole("listitem")).toHaveLength(2);
  });
});

describe("NotificationPrefs", () => {
  it("saves the changed preference with the others unchanged", async () => {
    const user = userEvent.setup();
    const save = spyOn({ operationId: "updateNotificationPrefs" });
    server.use(save.handler);
    renderWithProviders(<NotificationPrefs />);
    const save$ = await screen.findByRole("button", { name: "Save preferences" });
    expect(save$).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: /WhatsApp/ }));
    await user.click(save$);
    expect(await screen.findByRole("status")).toHaveTextContent("Saved.");
    expect(save.calls[0].body).toEqual({ email: true, whatsapp: false, marketing: false });
  });
});

describe("PaymentResult", () => {
  it("shows the server's status for the payment, not the redirect", async () => {
    renderWithProviders(<PaymentResult />);
    expect(await screen.findByRole("heading", { name: "We are confirming your payment" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the shipment" })).toHaveAttribute("href", "/shipments/0193a5e0-5555-7000-8000-000000000001");
  });
});
