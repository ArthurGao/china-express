"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { $api, newIdempotencyKey } from "@/lib/api/client";
import type { PreNotice } from "@/lib/api/types";
import { parseTrackingLines } from "@/lib/tracking";

export function TrackingNumbers({ notice }: { notice: PreNotice }) {
  const t = useTranslations("preNotice.tracking");
  const queryClient = useQueryClient();
  const add = $api.useMutation("patch", "/pre-notices/{preNoticeId}/trackings");
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);

  function save() {
    const parsed = parseTrackingLines(text);
    setInvalid(parsed === null || parsed.length === 0);
    if (!parsed || parsed.length === 0) return;
    add.mutate(
      { params: { path: { preNoticeId: notice.id }, header: { "Idempotency-Key": newIdempotencyKey() } }, body: { add: parsed } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(
            $api.queryOptions("get", "/pre-notices/{preNoticeId}", { params: { path: { preNoticeId: notice.id } } }).queryKey,
            updated,
          );
          setText("");
        },
      },
    );
  }


  return (
    <section className="grid gap-3" aria-labelledby="tracking-title">
      <h2 id="tracking-title" className="text-lg font-semibold">{t("title")}</h2>
      {notice.trackings.length > 0 ? (
        <ul className="grid gap-1 font-mono text-sm" data-testid="tracking-list">
          {notice.trackings.map((x) => <li key={x.trackingNo}>{x.carrier ? `${x.carrier} · ` : ""}{x.trackingNo}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      )}
      <Label htmlFor="add-tracking" className="text-sm font-normal text-muted-foreground">{t("intro")}</Label>
      <Textarea id="add-tracking" rows={3} className="font-mono" value={text} onChange={(e) => setText(e.target.value)} aria-invalid={invalid} />
      {invalid && <p className="text-sm text-destructive">{t("invalid")}</p>}
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" className="h-11" onClick={save} disabled={add.isPending}>{t("save")}</Button>
        {add.isSuccess && <span className="text-sm text-success">{t("saved")}</span>}
      </div>
    </section>
  );
}
