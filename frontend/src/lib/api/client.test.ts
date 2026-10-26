import { afterEach, describe, expect, it } from "vitest";
import { spyOn } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { fetchClient, setAccessTokenProvider } from "./client";

describe("API client auth", () => {
  afterEach(() => setAccessTokenProvider(async () => null));

  it("sends the current Supabase access token as a Bearer token", async () => {
    const spy = spyOn({ operationId: "getMe" });
    server.use(spy.handler);
    setAccessTokenProvider(async () => "header.payload.signature");
    await fetchClient.GET("/me");
    expect(spy.calls[0].headers.get("Authorization")).toBe("Bearer header.payload.signature");
  });

  it("sends no Authorization header when signed out", async () => {
    const spy = spyOn({ operationId: "getMe" });
    server.use(spy.handler);
    await fetchClient.GET("/me");
    expect(spy.calls[0].headers.has("Authorization")).toBe(false);
  });
});
