import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Estimate, ProductQuote } from "@/lib/api/types";
import { exampleFor } from "@/mocks/handlers";
import { renderWithProviders } from "@/test/render";
import { normalizeSpaces as nbsp } from "@/test/text";
import { QuoteResults } from "./quote-results";

const auckland = exampleFor({ operationId: "createEstimate", example: "auckland7kg" }) as Estimate;
const kerikeri = exampleFor({ operationId: "createEstimate", example: "kerikeriLcl" }) as Estimate;

function Harness({ estimate, onNext }: { estimate: Estimate; onNext: () => void }) {
  const [selected, setSelected] = useState<ProductQuote["product"] | null>(null);
  return <QuoteResults estimate={estimate} selected={selected} onSelect={setSelected} onNext={onNext} />;
}

describe("QuoteResults", () => {
  it("shows the backend's lines and totals verbatim, with +GST only where the API says so", () => {
    renderWithProviders(<Harness estimate={auckland} onNext={vi.fn()} />);
    const parcel = screen.getByTestId("option-SEA_PARCEL");
    expect(nbsp(within(parcel).getByTestId("total-SEA_PARCEL-NZD").textContent)).toBe("NZD 26.00+GST");
    expect(nbsp(within(parcel).getByText("Sea freight").nextSibling?.textContent ?? "")).toBe("NZD 14.00");
    expect(within(parcel).getByText("Cheapest")).toBeInTheDocument();
    expect(nbsp(screen.getByTestId("total-SEA_LCL-NZD").textContent)).toBe("NZD 376.65+GST");
  });

  it("omits +GST when the API says GST does not apply", () => {
    const noGst: Estimate = structuredClone(auckland);
    noGst.options[0].totals = [{ currency: "NZD", amountExGst: "26.00", gstApplies: false }];
    renderWithProviders(<Harness estimate={noGst} onNext={vi.fn()} />);
    expect(nbsp(screen.getByTestId("total-SEA_PARCEL-NZD").textContent)).toBe("NZD 26.00");
  });

  it("presents AIR as needing a manual quote, with no price and nothing to choose", () => {
    renderWithProviders(<Harness estimate={auckland} onNext={vi.fn()} />);
    const air = screen.getByTestId("option-AIR");
    expect(within(air).getByText("Needs a manual quote")).toBeInTheDocument();
    expect(within(air).getByText(/Air freight is quoted by our team/)).toBeInTheDocument();
    expect(within(air).queryByRole("button")).toBeNull();
    expect(within(air).queryByText(/NZD/)).toBeNull();
  });

  it("explains an unavailable product using the API's reason", () => {
    renderWithProviders(<Harness estimate={kerikeri} onNext={vi.fn()} />);
    const parcel = screen.getByTestId("option-SEA_PARCEL");
    expect(within(parcel).getByText("Not available")).toBeInTheDocument();
    expect(within(parcel).getByText(/Choose Sea LCL instead/)).toBeInTheDocument();
    expect(nbsp(screen.getByTestId("total-SEA_LCL-NZD").textContent)).toBe("NZD 2,455.65+GST");
  });

  it("preselects nothing and only continues once the customer chooses", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderWithProviders(<Harness estimate={auckland} onNext={onNext} />);
    const next = screen.getByRole("button", { name: "What to do next" });
    expect(next).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Choose this option" })).toHaveLength(2);

    await user.click(within(screen.getByTestId("option-SEA_LCL")).getByRole("button", { name: "Choose this option" }));
    expect(screen.getByTestId("option-SEA_LCL")).toHaveAttribute("aria-current", "true");
    await user.click(next);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
