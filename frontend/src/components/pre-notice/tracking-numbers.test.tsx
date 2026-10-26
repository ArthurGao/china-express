import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it } from "vitest";
import { $api } from "@/lib/api/client";
import type { PreNotice } from "@/lib/api/types";
import { apiUrl } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { TrackingNumbers } from "./tracking-numbers";

const notice: PreNotice = {
  id: "0193a5d0-3333-7000-8000-000000000001",
  status: "SUBMITTED",
  product: "SEA_PARCEL",
  destination: { region: "AKL", cityId: "akl" },
  createdAt: "2026-10-26T09:35:00Z",
  trackings: [],
};

// Mirrors PreNoticeDone: the notice comes from the query cache, which the component updates after saving.
function Harness() {
  const { data } = $api.useQuery("get", "/pre-notices/{preNoticeId}", { params: { path: { preNoticeId: notice.id } } });
  return data ? <TrackingNumbers notice={data} /> : null;
}

describe("TrackingNumbers", () => {
  it("adds the typed numbers to the notice and lists what the API returns", async () => {
    const user = userEvent.setup();
    let sent: unknown;
    server.use(
      http.get(apiUrl("/pre-notices/{preNoticeId}"), () => HttpResponse.json(notice)),
      http.patch(apiUrl("/pre-notices/{preNoticeId}/trackings"), async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ ...notice, trackings: [{ carrier: null, trackingNo: "SF1234567890123" }, { carrier: null, trackingNo: "YT9988776655" }] });
      }),
    );
    renderWithProviders(<Harness />);
    expect(await screen.findByText("No tracking numbers yet.")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/add the domestic courier tracking numbers/), "SF1234567890123\nYT9988776655");
    await user.click(screen.getByRole("button", { name: "Save tracking numbers" }));

    const list = await screen.findByTestId("tracking-list");
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["SF1234567890123", "YT9988776655"]);
    expect(sent).toEqual({ add: [{ carrier: null, trackingNo: "SF1234567890123" }, { carrier: null, trackingNo: "YT9988776655" }] });
    expect(screen.getByText("Saved.")).toBeInTheDocument();
  });

  it("does not send an empty list", async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(http.patch(apiUrl("/pre-notices/{preNoticeId}/trackings"), () => { calls++; return HttpResponse.json(notice); }));
    renderWithProviders(<TrackingNumbers notice={notice} />);
    await user.click(screen.getByRole("button", { name: "Save tracking numbers" }));
    expect(screen.getByText("Each tracking number needs 4 to 50 characters.")).toBeInTheDocument();
    expect(calls).toBe(0);
  });
});
