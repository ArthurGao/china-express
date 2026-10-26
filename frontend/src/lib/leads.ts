import { fetchClient } from "@/lib/api/client";
import type { LeadTouch } from "@/lib/api/types";

// Sales links carry ?src= / utm_* / c= / ref=. The first source a visitor arrived with is kept (first touch) and
// sent with every funnel stage. Storage can be unavailable (private mode, blocked site data): tracking then
// degrades to the current URL only and never breaks the page.
const VISITOR_KEY = "ce-visitor-id";
const SOURCE_KEY = "ce-first-source";

export type LeadSource = LeadTouch["source"];
export type LeadStage = LeadTouch["stage"];

const PARAMS: [keyof LeadSource, string[]][] = [
  ["src", ["src"]],
  ["utmSource", ["utm_source"]],
  ["utmMedium", ["utm_medium"]],
  ["utmCampaign", ["utm_campaign"]],
  ["c", ["c"]],
  ["ref", ["ref"]],
];

export function sourceFromParams(params: URLSearchParams): LeadSource {
  // On /login the original link's parameters sit inside ?next=/quote?src=…
  const next = params.get("next");
  if (next?.includes("?")) {
    const nested = sourceFromParams(new URLSearchParams(next.slice(next.indexOf("?") + 1)));
    if (Object.keys(nested).length > 0) return nested;
  }
  const source: LeadSource = {};
  for (const [key, names] of PARAMS) {
    const value = names.map((n) => params.get(n)).find((v) => v && v.trim());
    if (value) source[key] = value.trim().slice(0, 100);
  }
  return source;
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function visitorId(): string {
  const s = storage();
  try {
    const existing = s?.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    s?.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Keeps the first non-empty source; later visits without parameters do not overwrite it. */
export function firstTouchSource(current: LeadSource): LeadSource {
  const s = storage();
  try {
    const saved = s?.getItem(SOURCE_KEY);
    if (saved) return JSON.parse(saved) as LeadSource;
    if (Object.keys(current).length > 0) s?.setItem(SOURCE_KEY, JSON.stringify(current));
  } catch {
    // fall through to the current URL's source
  }
  return current;
}

export async function touchLead(stage: LeadStage): Promise<void> {
  try {
    const source = firstTouchSource(sourceFromParams(new URLSearchParams(window.location.search)));
    await fetchClient.POST("/leads/touch", {
      body: { visitorId: visitorId(), stage, source, path: window.location.pathname.slice(0, 300) },
      keepalive: true,
    });
  } catch {
    // Tracking must never interrupt the customer.
  }
}
