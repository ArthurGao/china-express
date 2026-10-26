import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiUrl, spyOn } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { AccountPage } from "./account-page";

let search = "";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search) }));

describe("AccountPage", () => {
  let linkCalls: ReturnType<typeof spyOn>["calls"];
  beforeEach(() => {
    search = "";
    const spy = spyOn({ operationId: "linkIdentity" });
    linkCalls = spy.calls;
    server.use(spy.handler);
  });

  it("shows the member number and the sign-in methods from the API, offering only what is not linked", async () => {
    renderWithProviders(<AccountPage />);
    expect(await screen.findByTestId("account-member-no")).toHaveTextContent("CE-123456-7");
    const list = screen.getByTestId("identities");
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Email codealex@example.co.nz"]);
    expect(screen.getByRole("button", { name: "Link my Google account" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add email sign-in" })).toBeNull();
    expect(linkCalls).toEqual([]);
  });

  it("records a Google link once after returning from Google and shows the updated list", async () => {
    search = "linked=google";
    renderWithProviders(<AccountPage />);
    expect(await screen.findByRole("status")).toHaveTextContent("Google is now linked.");
    expect(linkCalls.map((c) => c.body)).toEqual([{ provider: "google" }]);
    const list = screen.getByTestId("identities");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Link my Google account" })).toBeNull();
  });

  it("explains a refused link without merging anything", async () => {
    search = "linked=google";
    server.use(http.post(apiUrl("/me/identities/link"), () =>
      HttpResponse.json({ type: "about:blank", title: "Conflict", status: 409, code: "IDENTITY_BELONGS_TO_ANOTHER_CUSTOMER" }, { status: 409 })));
    renderWithProviders(<AccountPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("If it already belongs to another account, sign in with it instead.");
  });
});
