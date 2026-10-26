import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/render";
import { InAppBrowserBanner } from "./in-app-browser-banner";

const MESSENGER = "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 [FBAN/MessengerForiOS;FBAV/482.0.0.40.110]";
const SAFARI = "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.1 Mobile/15E148 Safari/604.1";

describe("InAppBrowserBanner", () => {
  it("tells a Messenger user to open the page in their browser and copies the exact link", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InAppBrowserBanner userAgent={MESSENGER} />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Open this page in your browser");
    expect(alert).toHaveTextContent("You are inside Messenger.");

    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await navigator.clipboard.readText()).toBe(window.location.href);
    expect(screen.getByRole("button", { name: "Link copied" })).toBeInTheDocument();
  });

  it("shows nothing in Safari", async () => {
    renderWithProviders(<InAppBrowserBanner userAgent={SAFARI} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
