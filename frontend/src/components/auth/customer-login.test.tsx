import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { CustomerLogin } from "./customer-login";

// Toggled per test: the demo build (ADR 0004) changes only the copy after "Email me a code".
const build = vi.hoisted(() => ({ demo: false }));
vi.mock("@/lib/demo", () => ({ get DEMO() { return build.demo; } }));

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("next=/pre-notice/new") }));
// Successful sign-in does a full page navigation, which jsdom cannot perform; observe the helper call instead.
const assign = vi.hoisted(() => vi.fn());
vi.mock("@/lib/navigation", () => ({ hardNavigate: assign }));

const AUTH = "http://supabase.test/auth/v1";

describe("CustomerLogin (email 6-digit code)", () => {
  let otpRequests: unknown[];

  beforeEach(() => {
    otpRequests = [];
    build.demo = false;
    assign.mockReset();
    server.use(
      http.post(`${AUTH}/otp`, async ({ request }) => {
        otpRequests.push(await request.json());
        return HttpResponse.json({});
      }),
      http.post(`${AUTH}/verify`, async ({ request }) => {
        const body = (await request.json()) as { token: string };
        if (body.token !== "123456") return HttpResponse.json({ code: 403, msg: "Token has expired or is invalid" }, { status: 403 });
        return HttpResponse.json({
          access_token: "header.payload.signature",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "refresh",
          user: { id: "u1", aud: "authenticated", email: "alex@example.co.nz", app_metadata: {}, user_metadata: {}, created_at: "2026-10-26T00:00:00Z" },
        });
      }),
    );
  });

  it("rejects an invalid email without calling Supabase", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomerLogin />);
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Email me a code" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(otpRequests).toEqual([]);
  });

  it("sends a code, refuses a wrong one, and continues to the requested page with the right one", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CustomerLogin />);
    await user.type(screen.getByLabelText("Email"), "alex@example.co.nz");
    await user.click(screen.getByRole("button", { name: "Email me a code" }));

    expect(await screen.findByText("We sent a code to alex@example.co.nz.")).toBeInTheDocument();
    expect(otpRequests).toHaveLength(1);
    expect(otpRequests[0]).toMatchObject({ email: "alex@example.co.nz", create_user: true });

    await user.type(screen.getByLabelText("6-digit code"), "000000");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That code is not right or has expired.");
    expect(assign).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("6-digit code"));
    await user.type(screen.getByLabelText("6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/pre-notice/new"));
  });

  it("in the demo build, says no email is sent instead of claiming one was", async () => {
    build.demo = true;
    const user = userEvent.setup();
    renderWithProviders(<CustomerLogin />);
    await user.type(screen.getByLabelText("Email"), "alex@example.co.nz");
    await user.click(screen.getByRole("button", { name: "Email me a code" }));
    expect(await screen.findByText("Demo: no email is sent. Enter any 6 digits, for example 123456.")).toBeInTheDocument();
    expect(screen.queryByText(/We sent a code/)).toBeNull();
  });
});
