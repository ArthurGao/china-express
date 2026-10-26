"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/api/client";
import { getAccessToken } from "@/lib/supabase/browser";
import { batchInvalidations, isStaleAfter, readEventStream } from "./event-stream";

// Mock and demo builds have no backend to push events.
export const LIVE = process.env.NEXT_PUBLIC_API_MOCKING !== "enabled";
const MAX_BACKOFF_MS = 30_000;

/** Keeps the signed-in view current: each server event refreshes the reads it affects. Reconnects with backoff. */
export function useLiveUpdates(enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!LIVE || !enabled) return;
    const controller = new AbortController();
    let lastEventId: string | undefined;
    let failures = 0;
    const batch = batchInvalidations((entities) =>
      void queryClient.invalidateQueries({ predicate: (q) => [...entities].some((entity) => isStaleAfter(q.queryKey, entity)) }));
    void (async () => {
      while (!controller.signal.aborted) {
        try {
          lastEventId = await readEventStream({
            url: `${API_BASE_URL}/events/stream`, token: await getAccessToken(), lastEventId, signal: controller.signal,
            onEvent: (event) => {
              failures = 0;
              batch.add(event.entity);
            },
          });
        } catch {
          if (controller.signal.aborted) return;
          failures += 1;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(MAX_BACKOFF_MS, 1000 * 2 ** failures)));
      }
    })();
    return () => {
      controller.abort();
      batch.cancel();
    };
  }, [enabled, queryClient]);
}
