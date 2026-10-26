import "fake-indexeddb/auto";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { apiUrl, spyOn } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { fitWithin } from "./compress";
import { UploadQueue } from "./upload-queue";

describe("fitWithin", () => {
  it.each([
    [4032, 3024, { width: 1600, height: 1200 }],
    [3024, 4032, { width: 1200, height: 1600 }],
    [1200, 800, { width: 1200, height: 800 }],
  ])("fits %ix%i into 1600 px on the long side", (w, h, expected) => {
    expect(fitWithin(w, h)).toEqual(expected);
  });
});

function photo() {
  return { blob: new Blob(["jpeg-bytes"], { type: "image/webp" }), contentType: "image/webp", kind: "overview" as const };
}

describe("UploadQueue", () => {
  it("uploads a photo through a signed URL, remembers its file id, and tells listeners without the bytes", async () => {
    const upload = vi.fn(async () => {});
    const queue = new UploadQueue(upload);
    const seen: unknown[][] = [];
    queue.subscribe((items) => seen.push(items));
    const item = await queue.enqueue({ ...photo(), parcelId: null });
    await queue.process();
    const stored = (await queue.items()).find((i) => i.id === item.id)!;
    expect(stored.state).toBe("uploaded");
    expect(stored.fileId).toBe("0193a5f0-8888-7000-8000-000000000001");
    expect(upload).toHaveBeenCalledWith("https://storage.example.invalid/demo-storage/0193a5f0-8888-7000-8000-000000000001", expect.any(Blob), "image/webp");
    expect(new TextDecoder().decode(await queue.bytes(item.id))).toBe("jpeg-bytes");
    await vi.waitFor(() => expect(seen.length).toBeGreaterThan(1));
    expect(seen.flat().every((i) => !("bytes" in (i as object)))).toBe(true);
  });

  it("backs off after a failure, and retries at once when forced (network back)", async () => {
    let online = false;
    let clock = 1_000_000;
    const upload = vi.fn(async () => { if (!online) throw new Error("offline"); });
    const queue = new UploadQueue(upload, () => clock);
    const item = await queue.enqueue({ ...photo(), parcelId: null });
    await queue.process();
    expect((await queue.items()).find((i) => i.id === item.id)?.state).toBe("failed");

    online = true;
    await queue.process();
    expect(upload).toHaveBeenCalledTimes(1); // not due yet: back-off
    clock += 10_000;
    await queue.process();
    const stored = (await queue.items()).find((i) => i.id === item.id);
    expect(stored?.state).toBe("uploaded");
    expect(stored?.attempts).toBe(2);
  });

  it("attaches a photo taken after receiving to its parcel once, then drops it from the queue", async () => {
    const attach = spyOn({ operationId: "addParcelPhoto" });
    server.use(attach.handler);
    const queue = new UploadQueue(async () => {});
    const item = await queue.enqueue({ ...photo(), kind: "damage", parcelId: "0193a5f0-6666-7000-8000-000000000125" });
    await queue.process();
    await queue.process({ force: true });
    expect(attach.calls).toHaveLength(1);
    expect(attach.calls[0].body).toEqual({ fileId: "0193a5f0-8888-7000-8000-000000000001", kind: "damage" });
    expect(attach.calls[0].headers.get("Idempotency-Key")).toBe(item.id);
    expect((await queue.items()).some((i) => i.id === item.id)).toBe(false);
    expect(await queue.bytes(item.id)).toBeUndefined();
  });

  it("does not mark a photo uploaded when no upload URL could be had", async () => {
    server.use(http.post(apiUrl("/files/upload-url"), () => HttpResponse.json({ type: "x", title: "x", status: 503, code: "UNAVAILABLE" }, { status: 503 })));
    const upload = vi.fn(async () => {});
    const queue = new UploadQueue(upload);
    const item = await queue.enqueue({ ...photo(), parcelId: null });
    await queue.process();
    expect((await queue.items()).find((i) => i.id === item.id)?.state).toBe("failed");
    expect(upload).not.toHaveBeenCalled();
  });

  it("forgets uploaded photos nobody used after a day", async () => {
    let clock = 5_000_000;
    const first = new UploadQueue(async () => {}, () => clock);
    const item = await first.enqueue({ ...photo(), parcelId: null });
    await first.process();
    clock += 25 * 60 * 60_000;
    const later = new UploadQueue(async () => {}, () => clock);
    expect((await later.items()).some((i) => i.id === item.id)).toBe(false);
  });
});
