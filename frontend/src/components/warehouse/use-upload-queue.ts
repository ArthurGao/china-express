"use client";

import { useEffect, useState } from "react";
import { getUploadQueue, type QueueItem } from "@/lib/photos/upload-queue";

/** Live view of the tablet's photo queue (metadata only). Retrying is the queue's own job. */
export function useUploadQueue(): QueueItem[] {
  const [items, setItems] = useState<QueueItem[]>([]);
  useEffect(() => getUploadQueue().subscribe(setItems), []);
  return items;
}
