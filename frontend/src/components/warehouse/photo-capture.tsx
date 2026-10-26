"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { compressPhoto } from "@/lib/photos/compress";
import { getUploadQueue, type PhotoKind, type QueueItem } from "@/lib/photos/upload-queue";

/** Camera input for the tablet: each photo is compressed, stored in the upload queue, then uploaded. */
export function PhotoCapture({ items, kind, parcelId = null, onQueued }: {
  items: QueueItem[]; kind: (index: number) => PhotoKind; parcelId?: string | null; onQueued: (ids: string[]) => void;
}) {
  const t = useTranslations("warehouse.photos");
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const queue = getUploadQueue();
    const ids: string[] = [];
    for (const [i, file] of [...files].entries()) {
      const blob = await compressPhoto(file);
      ids.push((await queue.enqueue({ blob, contentType: "image/webp", kind: kind(items.length + i), parcelId })).id);
    }
    onQueued(ids);
    setBusy(false);
  }

  return (
    <div className="grid gap-2">
      <label className="flex h-14 cursor-pointer items-center justify-center border border-dashed border-foreground text-base font-medium">
        {busy ? t("processing") : t("take")}
        <input type="file" accept="image/*" capture="environment" multiple className="sr-only" aria-label={t("take")}
          onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
      </label>
      {items.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto" data-testid="photo-strip">
          {items.map((item) => <Thumb key={item.id} item={item} />)}
        </ul>
      )}
    </div>
  );
}

function Thumb({ item }: { item: QueueItem }) {
  const t = useTranslations("warehouse.photos");
  const [url, setUrl] = useState<string | null>(null);
  // Bytes never change for an id, so the preview is built once per photo, not on every queue update.
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void getUploadQueue().bytes(item.id).then((bytes) => {
      if (cancelled || !bytes) return;
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: item.contentType }));
      setUrl(objectUrl);
    });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.id, item.contentType]);
  return (
    <li className="relative h-20 w-28 shrink-0 border border-rule bg-surface" data-state={item.state}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
      {url && <img src={url} alt={t(`kind.${item.kind}`)} className="h-full w-full object-cover" />}
      <span className={`absolute right-0 bottom-0 px-1 text-xs ${item.state === "uploaded" ? "bg-success text-white" : item.state === "failed" ? "bg-warning text-white" : "bg-foreground text-background"}`}>
        {t(`state.${item.state}`)}
      </span>
    </li>
  );
}
