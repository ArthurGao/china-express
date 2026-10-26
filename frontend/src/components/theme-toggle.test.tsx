import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { ThemeToggle } from "./theme-toggle";

function prefersDark(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches, media: query, addEventListener() {}, removeEventListener() {} }));
}

describe("ThemeToggle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.choice;
    document.cookie = "ce-theme=; path=/; max-age=0";
  });

  it("shows the choice the server rendered (light by default)", () => {
    renderWithProviders(<ThemeToggle />);
    expect(screen.getByLabelText("Colour theme")).toHaveValue("light");
  });

  it("shows a stored dark choice", () => {
    document.documentElement.dataset.choice = "dark";
    renderWithProviders(<ThemeToggle />);
    expect(screen.getByLabelText("Colour theme")).toHaveValue("dark");
  });

  it("applies dark at once and remembers it in a cookie", async () => {
    const user = userEvent.setup();
    prefersDark(false);
    renderWithProviders(<ThemeToggle />);
    await user.selectOptions(screen.getByLabelText("Colour theme"), "dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.cookie).toContain("ce-theme=dark");
  });

  it("follows the device when set to system", async () => {
    const user = userEvent.setup();
    prefersDark(true);
    renderWithProviders(<ThemeToggle />);
    await user.selectOptions(screen.getByLabelText("Colour theme"), "system");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.choice).toBe("system");
  });
});
