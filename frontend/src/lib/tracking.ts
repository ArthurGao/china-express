import type { Tracking } from "@/lib/api/types";

/** One tracking number per line; blank lines ignored, duplicates removed. Returns null if any line is invalid. */
export function parseTrackingLines(text: string): Tracking[] | null {
  const numbers = [...new Set(text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))];
  if (numbers.some((n) => n.length < 4 || n.length > 50)) return null;
  return numbers.map((trackingNo) => ({ carrier: null, trackingNo }));
}
