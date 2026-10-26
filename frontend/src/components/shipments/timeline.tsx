"use client";

import type { components } from "@/lib/api/generated/schema";
import { useLocalized } from "@/lib/i18n-text";
import { When } from "@/components/when";

type TimelineEvent = components["schemas"]["TimelineEvent"];

/** Events as the backend records them (shipment_events), newest first; used by customers and staff alike. */
export function Timeline({ events }: { events: TimelineEvent[] }) {
  const localized = useLocalized();
  return (
    <ol className="grid gap-0 border-l border-rule" data-testid="timeline">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative grid gap-0.5 pb-4 pl-4 before:absolute before:top-1.5 before:-left-[4.5px] before:size-2 before:bg-foreground">
          <span className="text-xs text-muted-foreground"><When iso={e.at} /></span>
          <span className="font-medium">{localized(e.label)}</span>
          {e.detail && <span className="text-sm text-muted-foreground">{localized(e.detail)}</span>}
        </li>
      ))}
    </ol>
  );
}
