import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { QuoteForm } from "./quote-form";

async function fillCarton(user: ReturnType<typeof userEvent.setup>, i: number, v: [string, string, string, string, string]) {
  const labels = ["Length cm", "Width cm", "Height cm", "Weight kg", "Qty"];
  const item = screen.getByText(`Item ${i + 1}`).closest("li")!;
  for (const [j, label] of labels.entries()) {
    const input = within(item).getByLabelText(label);
    await user.clear(input);
    await user.type(input, v[j]);
  }
}

describe("QuoteForm", () => {
  it("shows what is missing and does not submit an empty form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<QuoteForm onSubmit={onSubmit} submitting={false} />);
    await user.click(screen.getByRole("button", { name: "Get my quote" }));
    expect(await screen.findByText("Choose a region.")).toBeInTheDocument();
    expect(screen.getByText("Enter an amount like 250 or 250.00.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects zero sizes and a fractional quantity", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<QuoteForm onSubmit={onSubmit} submitting={false} />);
    await user.click(screen.getByLabelText("Auckland"));
    await user.selectOptions(await screen.findByLabelText("Nearest city"), "akl");
    await fillCarton(user, 0, ["0", "20", "20", "7", "1.5"]);
    await user.type(screen.getByLabelText("Total value of all items together"), "250");
    await user.click(screen.getByRole("button", { name: "Get my quote" }));
    expect(await screen.findByText("Whole number, 1 or more.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("offers only the chosen region's cities and builds the exact estimate request", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<QuoteForm onSubmit={onSubmit} submitting={false} />);

    await user.click(screen.getByLabelText("Rest of North Island"));
    const city = await screen.findByLabelText("Nearest city");
    await screen.findByRole("option", { name: "Kerikeri" });
    expect(within(city).getAllByRole("option").map((o) => o.textContent)).toEqual(["Choose…", "Kerikeri", "Hamilton"]);
    await user.selectOptions(city, "kerikeri");

    await fillCarton(user, 0, ["50", "40", "30", "7.5", "2"]);
    await user.click(screen.getByRole("button", { name: "+ Add another item" }));
    await fillCarton(user, 1, ["30", "20", "20", "3", "1"]);
    await user.type(screen.getByLabelText("Total value of all items together"), "1250.5");
    await user.click(screen.getByRole("button", { name: "Get my quote" }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      destination: { region: "NI_OTHER", cityId: "kerikeri" },
      cartons: [
        { lengthCm: "50", widthCm: "40", heightCm: "30", weightKg: "7.5", quantity: 2 },
        { lengthCm: "30", widthCm: "20", heightCm: "20", weightKg: "3", quantity: 1 },
      ],
      declaredValueNzd: "1250.50",
    });
  });

  it("fills region, city and postcode from a postcode lookup", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<QuoteForm onSubmit={onSubmit} submitting={false} />);
    await user.click(screen.getByRole("button", { name: "Not sure? Check by postcode" }));
    await user.type(screen.getByLabelText("Postcode"), "0230");
    await user.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Kerikeri, delivery zone found.")).toBeInTheDocument();
    expect(screen.getByLabelText("Rest of North Island")).toBeChecked();

    await fillCarton(user, 0, ["30", "20", "20", "7", "1"]);
    await user.type(screen.getByLabelText("Total value of all items together"), "250");
    await user.click(screen.getByRole("button", { name: "Get my quote" }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0].destination).toEqual({ region: "NI_OTHER", cityId: "kerikeri", postcode: "0230" });
  });
});
