import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/render";
import { MemberNumber } from "./member-number";

describe("MemberNumber", () => {
  it("shows the member number from GET /me in the stencil face", async () => {
    renderWithProviders(<MemberNumber />);
    const el = await screen.findByTestId("member-no");
    expect(el).toHaveTextContent("CE-123456-7");
    expect(el).toHaveClass("font-stencil");
    expect(screen.getByText("Member")).toBeInTheDocument();
  });
});
