import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { apiUrl, exampleFor, exampleHandler } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { normalizeSpaces as nbsp } from "@/test/text";
import { FclEstimate } from "./fcl-estimate";


async function choose(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole("option", { name: "Shanghai" });
  await user.selectOptions(screen.getByLabelText("Container size"), "40");
  await user.selectOptions(screen.getByLabelText("FOB origin (China port)"), "CNSHA");
  await user.selectOptions(screen.getByLabelText("Destination (NZ port)"), "NZAKL");
}

describe("FclEstimate", () => {
  it("asks for size and ports before requesting anything", async () => {
    const user = userEvent.setup();
    let requests = 0;
    server.use(http.post(apiUrl("/quotes/fcl"), () => { requests++; return HttpResponse.json({}, { status: 500 }); }));
    renderWithProviders(<FclEstimate />);
    await user.click(screen.getByRole("button", { name: "Show ocean freight" }));
    expect(screen.getByText("Choose a size and both ports.")).toBeInTheDocument();
    expect(requests).toBe(0);
  });

  it("sends the chosen route and shows USD and NZD separately, never added together", async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.post(apiUrl("/quotes/fcl"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(exampleFor({ operationId: "createFclEstimate", example: "shanghaiAuckland40" }) as object, { status: 201 });
      }),
    );
    renderWithProviders(<FclEstimate />);
    await choose(user);
    await user.click(screen.getByRole("button", { name: "Add NZ local charges & door delivery →" }));

    const result = await screen.findByTestId("fcl-result");
    expect(body).toEqual({ size: "40", originPort: "CNSHA", destPort: "NZAKL", includeLocalCharges: true });
    expect(nbsp(within(result).getByTestId("fcl-summary").textContent)).toBe("USD 6,818.00 + NZD 2,988.14+GST");
    expect(within(result).getByRole("heading", { name: "Customs, trucking & delivery" })).toBeInTheDocument();
    expect(within(result).getByRole("heading", { name: "Port & shipping line charges" })).toBeInTheDocument();
    expect(within(result).getByText(/valid for 3 days/)).toBeInTheDocument();
  });

  it("routes an expired rate sheet to a manual quote with no figures", async () => {
    const user = userEvent.setup();
    server.use(exampleHandler({ operationId: "createFclEstimate", example: "rateSheetExpired" }));
    renderWithProviders(<FclEstimate />);
    expect(await screen.findByRole("status")).toHaveTextContent("rate sheet expired");
    await choose(user);
    await user.click(screen.getByRole("button", { name: "Show ocean freight" }));
    const review = await screen.findByTestId("fcl-review");
    expect(review).toHaveTextContent("Our container rates are being updated.");
    expect(screen.queryByTestId("fcl-result")).toBeNull();
    expect(screen.queryByText(/USD/)).toBeNull();
  });
});
