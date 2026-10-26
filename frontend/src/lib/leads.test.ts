import { http, HttpResponse } from "msw/http";
import { beforeEach, describe, expect, it } from "vitest";
import { apiUrl } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { firstTouchSource, sourceFromParams, touchLead, visitorId } from "./leads";

describe("lead source tracking", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("reads the sales-link parameters", () => {
    expect(sourceFromParams(new URLSearchParams("src=fb-marketplace&utm_campaign=oct&c=ignored-dup&ref=sales-amy&x=1"))).toEqual({
      src: "fb-marketplace",
      utmCampaign: "oct",
      c: "ignored-dup",
      ref: "sales-amy",
    });
    expect(sourceFromParams(new URLSearchParams(`src=${"a".repeat(150)}`)).src).toHaveLength(100);
  });

  it("keeps the first source even when the visitor returns from another link", () => {
    expect(firstTouchSource({ src: "fb" })).toEqual({ src: "fb" });
    expect(firstTouchSource({ src: "whatsapp" })).toEqual({ src: "fb" });
  });

  it("does not store an empty source as the first touch", () => {
    expect(firstTouchSource({})).toEqual({});
    expect(firstTouchSource({ src: "fb" })).toEqual({ src: "fb" });
  });

  it("keeps one visitor id per browser", () => {
    expect(visitorId()).toBe(visitorId());
  });

  it("sends the stage with the first-touch source and the path", async () => {
    let body: unknown;
    server.use(http.post(apiUrl("/leads/touch"), async ({ request }) => {
      body = await request.json();
      return new HttpResponse(null, { status: 204 });
    }));
    window.history.replaceState(null, "", "/?src=fb-marketplace&ref=sales-amy");
    await touchLead("LANDING");
    expect(body).toEqual({ visitorId: visitorId(), stage: "LANDING", source: { src: "fb-marketplace", ref: "sales-amy" }, path: "/" });
  });

  it("never throws when the API is down", async () => {
    server.use(http.post(apiUrl("/leads/touch"), () => HttpResponse.error()));
    await expect(touchLead("QUOTE_OPENED")).resolves.toBeUndefined();
  });
});

describe("sourceFromParams on the login page", () => {
  it("reads the parameters carried inside next", () => {
    expect(sourceFromParams(new URLSearchParams("next=%2Fquote%3Fsrc%3Dfb%26ref%3Damy"))).toEqual({ src: "fb", ref: "amy" });
  });
});
