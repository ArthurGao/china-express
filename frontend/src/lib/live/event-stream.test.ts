import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/server";
import { batchInvalidations, isStaleAfter, parseSse, readEventStream, type LiveEvent } from "./event-stream";

const event = (id: string, entity: LiveEvent["entity"]): LiveEvent =>
  ({ id, type: `${entity}.updated`, entity, entityId: "0193a5f0-6666-7000-8000-000000000125", at: "2026-10-27T05:20:00Z" });

describe("parseSse", () => {
  it("returns complete events, skips heartbeats and keeps a partial event for the next chunk", () => {
    const { events, rest } = parseSse(`: heartbeat\n\nid: 7\ndata: {"a":1}\n\nid: 8\ndata: {"a"`);
    expect(events).toEqual([{ id: "7", data: '{"a":1}' }]);
    expect(rest).toBe('id: 8\ndata: {"a"');
  });
});

describe("readEventStream", () => {
  it("sends the token and Last-Event-ID, delivers events split across chunks, and returns the last id", async () => {
    let seen: Headers | undefined;
    server.use(http.get("http://api.test/api/v1/events/stream", ({ request }) => {
      seen = request.headers;
      const parts = [`id: 41\ndata: ${JSON.stringify(event("41", "parcel"))}\n\n: ping\n\nid: 42\nda`, `ta: ${JSON.stringify(event("42", "shipment"))}\n\n`];
      const body = new ReadableStream({ start(c) { parts.forEach((p) => c.enqueue(new TextEncoder().encode(p))); c.close(); } });
      return new HttpResponse(body, { headers: { "Content-Type": "text/event-stream" } });
    }));
    const received: LiveEvent[] = [];
    const last = await readEventStream({
      url: "http://api.test/api/v1/events/stream", token: "header.payload.signature", lastEventId: "40",
      signal: new AbortController().signal, onEvent: (e) => received.push(e),
    });
    expect(received.map((e) => [e.id, e.entity])).toEqual([["41", "parcel"], ["42", "shipment"]]);
    expect(last).toBe("42");
    expect(seen?.get("Authorization")).toBe("Bearer header.payload.signature");
    expect(seen?.get("Last-Event-ID")).toBe("40");
  });
});

describe("isStaleAfter", () => {
  it("refreshes the reads a parcel event can change, and only those", () => {
    expect(isStaleAfter(["get", "/shipments/{shipmentId}", {}], "parcel")).toBe(true);
    expect(isStaleAfter(["get", "/wh/unclaimed"], "parcel")).toBe(true);
    expect(isStaleAfter(["get", "/finance/receivables"], "parcel")).toBe(false);
    expect(isStaleAfter(["post", "/shipments/{shipmentId}/confirm-final"], "shipment")).toBe(false);
  });
});

describe("batchInvalidations", () => {
  it("refreshes once for a burst of events, with each entity type once", () => {
    vi.useFakeTimers();
    const invalidate = vi.fn();
    const batch = batchInvalidations(invalidate, 200);
    for (let i = 0; i < 20; i++) batch.add("parcel");
    batch.add("shipment");
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect([...invalidate.mock.calls[0][0]]).toEqual(["parcel", "shipment"]);
    batch.add("notification");
    vi.advanceTimersByTime(200);
    expect(invalidate).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
