// Live updates over SSE (design 08). Read with fetch rather than EventSource so the Supabase access token can travel in
// the Authorization header; `Last-Event-ID` resumes after a reconnect (the backend replays from shipment_events).
import type { components } from "@/lib/api/generated/schema";

export type LiveEvent = components["schemas"]["LiveEvent"];

/** Splits an SSE text buffer into complete events; returns them and the unfinished remainder. Comments (heartbeats) are skipped. */
export function parseSse(buffer: string): { events: { id: string | null; data: string }[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events = blocks.flatMap((block) => {
    let id: string | null = null;
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("id:")) id = line.slice(3).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    return data.length ? [{ id, data: data.join("\n") }] : [];
  });
  return { events, rest };
}

/** Reads one connection until it closes; calls `onEvent` for each event and returns the last event id seen. */
export async function readEventStream({ url, token, lastEventId, signal, onEvent }: {
  url: string; token: string | null; lastEventId: string | undefined; signal: AbortSignal; onEvent: (event: LiveEvent) => void;
}): Promise<string | undefined> {
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (lastEventId) headers["Last-Event-ID"] = lastEventId;
  const response = await fetch(url, { headers, signal });
  if (!response.ok || !response.body) throw new Error(`Event stream failed: ${response.status}`);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let last = lastEventId;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return last;
    const parsed = parseSse(buffer + value);
    buffer = parsed.rest;
    for (const e of parsed.events) {
      if (e.id) last = e.id;
      onEvent(JSON.parse(e.data) as LiveEvent);
    }
  }
}

// Which API reads an event can make stale (query keys are [method, path, init] from openapi-react-query).
const STALE_PATHS: Record<LiveEvent["entity"], string[]> = {
  shipment: ["/shipments", "/ops/shipments", "/ops/dashboard", "/wh/dispatch"],
  parcel: ["/shipments", "/pre-notices", "/wh/", "/ops/dashboard"],
  pre_notice: ["/shipments", "/pre-notices"],
  receivable: ["/shipments", "/finance/"],
  notification: ["/me/notifications"],
};

export function isStaleAfter(queryKey: readonly unknown[], entity: LiveEvent["entity"]): boolean {
  const [method, path] = queryKey;
  return method === "get" && typeof path === "string" && STALE_PATHS[entity].some((prefix) => path.startsWith(prefix));
}

/** Collects the entity types of a burst of events and invalidates once per burst (e.g. 20 parcel events → 1 refresh). */
export function batchInvalidations(invalidate: (entities: Set<LiveEvent["entity"]>) => void, delayMs = 200) {
  let pending = new Set<LiveEvent["entity"]>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    add(entity: LiveEvent["entity"]) {
      pending.add(entity);
      timer ??= setTimeout(() => {
        const entities = pending;
        pending = new Set();
        timer = undefined;
        invalidate(entities);
      }, delayMs);
    },
    cancel() {
      clearTimeout(timer);
    },
  };
}
