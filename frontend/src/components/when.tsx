"use client";

import { useFormatter } from "next-intl";

/** A timestamp from the API in the viewer's locale (Pacific/Auckland, set in i18n/request.ts). */
export function When({ iso, date = false }: { iso: string; date?: boolean }) {
  const format = useFormatter();
  return (
    <time dateTime={iso} className="tabular">
      {format.dateTime(new Date(iso), date ? { dateStyle: "medium" } : { dateStyle: "medium", timeStyle: "short" })}
    </time>
  );
}
