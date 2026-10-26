import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/render";
import { DemoBanner } from "./demo-banner";

describe("DemoBanner", () => {
  it("tells visitors the prices are fixed examples and how to sign in", () => {
    renderWithProviders(<DemoBanner />);
    expect(screen.getByRole("note")).toHaveTextContent(
      "DemoSample data: prices are fixed worked examples and do not change with your input. Any email, password and 6-digit code sign you in.",
    );
  });
});
