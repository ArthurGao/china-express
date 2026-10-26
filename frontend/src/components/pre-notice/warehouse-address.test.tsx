import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { exampleFor } from "@/mocks/handlers";
import { renderWithProviders } from "@/test/render";
import { WarehouseAddress } from "./warehouse-address";

const address = exampleFor({ operationId: "getWarehouseAddress" }) as { copyText: string };

describe("WarehouseAddress", () => {
  it("copies exactly the address text from the API, including the member number", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WarehouseAddress />);
    const block = await screen.findByTestId("warehouse-address");
    expect(block.textContent).toBe(address.copyText);
    expect(address.copyText).toContain("CE-123456-7");

    await user.click(screen.getByRole("button", { name: "Copy address for my supplier" }));
    expect(await navigator.clipboard.readText()).toBe(address.copyText);
    expect(screen.getByRole("button", { name: "Address copied" })).toBeInTheDocument();
  });

  it("says when the address is still a placeholder", async () => {
    renderWithProviders(<WarehouseAddress />);
    expect(await screen.findByText(/The full warehouse address is being finalised/)).toBeInTheDocument();
  });
});
