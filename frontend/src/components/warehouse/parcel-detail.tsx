"use client";

import { ErrorText, Flash, useFlash } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ReasonDialog } from "@/components/reason-dialog";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { When } from "@/components/when";
import { $api, errorStatus, idem } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { printPage } from "@/lib/print";
import { MeasurementFields, measurementsComplete, MeasurementsText, type Measurements } from "./measurement-fields";
import { ParcelLabel } from "./parcel-label";
import { PhotoCapture } from "./photo-capture";
import { useUploadQueue } from "./use-upload-queue";

type WhParcel = components["schemas"]["WhParcel"];
type HoldKind = components["schemas"]["ParcelHold"]["kind"];

export function ParcelDetail({ id }: { id: string }) {
  const t = useTranslations("warehouse.parcel");
  const queryClient = useQueryClient();
  const options = { params: { path: { parcelId: id } } };
  const parcel = $api.useQuery("get", "/wh/parcels/{parcelId}", options);
  const correct = $api.useMutation("patch", "/wh/parcels/{parcelId}/measurements");
  const hold = $api.useMutation("post", "/wh/parcels/{parcelId}/hold");
  const queueItems = useUploadQueue();
  const [editing, setEditing] = useState<{ measurements: Measurements; reason: string } | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [holdKind, setHoldKind] = useState<HoldKind>("DAMAGED");
  const flash = useFlash();

  if (parcel.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  const p = parcel.data;
  if (!p) return null;
  const store = (updated: WhParcel) => queryClient.setQueryData($api.queryOptions("get", "/wh/parcels/{parcelId}", options).queryKey, updated);
  const onError = (e: unknown) => flash.fail(t(errorStatus(e) === 409 ? "conflict" : "failed"));

  function saveCorrection(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !measurementsComplete(editing.measurements) || editing.reason.trim().length < 3) return setInvalid(true);
    correct.mutate({
      params: { path: { parcelId: id }, header: idem() },
      body: { measurements: editing.measurements, reason: editing.reason.trim(), expectedVersion: p!.version },
    }, { onSuccess: (u) => { store(u); setEditing(null); flash.ok(t("corrected")); }, onError });
  }

  function putOnHold(reason: string) {
    hold.mutate({
      params: { path: { parcelId: id }, header: idem() },
      body: { kind: holdKind, reason, expectedVersion: p!.version },
    }, { onSuccess: (u) => { store(u); flash.ok(t("held")); }, onError });
  }

  const attachable = p.status !== "dispatched" && p.status !== "returned";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="grid content-start gap-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-mono text-xl font-semibold">{p.parcelNo}</h1>
          <StatusBadge group="parcel" value={p.status} />
          {p.flags.map((f) => <span key={f} className="text-xs text-muted-foreground">{t(`flags.${f}`)}</span>)}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
          <dt className="text-muted-foreground">{t("member")}</dt><dd className="font-mono">{p.memberNo ?? t("none")}</dd>
          <dt className="text-muted-foreground">{t("preNotice")}</dt><dd className="font-mono">{p.preNotice?.reference ?? t("none")}</dd>
          <dt className="text-muted-foreground">{t("tracking")}</dt><dd className="font-mono">{[p.carrier, p.trackingNo].filter(Boolean).join(" ") || t("none")}</dd>
          <dt className="text-muted-foreground">{t("received")}</dt><dd><When iso={p.receivedAt} /> · {p.receivedBy}</dd>
          <dt className="text-muted-foreground">{t("measurements")}</dt>
          <dd className="tabular" data-testid="current-measurements"><MeasurementsText m={p.measurements} /></dd>
          {p.condition === "DAMAGED" && <><dt className="text-muted-foreground">{t("condition")}</dt><dd className="text-warning">{p.damageNote}</dd></>}
          {p.holdReason && <><dt className="text-muted-foreground">{t("holdReason")}</dt><dd className="text-warning">{p.holdReason}</dd></>}
        </dl>

        <Flash value={flash.flash} />

        <div className="flex flex-wrap items-center gap-2">
          {!editing && <Button variant="outline" className="h-14 px-6 text-base" onClick={() => { setInvalid(false); setEditing({ measurements: p.measurements, reason: "" }); }}>{t("correct")}</Button>}
          {p.status !== "held" && p.status !== "dispatched" && (
            <div className="flex items-center gap-2">
              <select aria-label={t("holdKind")} value={holdKind} onChange={(e) => setHoldKind(e.target.value as HoldKind)}
                className="h-14 border border-rule bg-background px-3 text-base">
                {(["DAMAGED", "PROHIBITED", "OTHER"] as const).map((k) => <option key={k} value={k}>{t(`holdKinds.${k}`)}</option>)}
              </select>
              <ReasonDialog trigger={t("hold")} title={t("holdTitle", { parcelNo: p.parcelNo })} description={t("holdBody")}
                confirmLabel={t("holdConfirm")} destructive pending={hold.isPending} onConfirm={putOnHold} triggerClassName="h-14 px-6 text-base" />
            </div>
          )}
        </div>

        {editing && (
          <form onSubmit={saveCorrection} className="grid gap-3 border border-rule bg-surface p-4" noValidate>
            <MeasurementFields idPrefix="fix" value={editing.measurements} invalid={invalid} onChange={(measurements) => setEditing({ ...editing, measurements })} />
            <Label htmlFor="fix-reason">{t("reason")}</Label>
            <Textarea id="fix-reason" value={editing.reason} aria-invalid={invalid && editing.reason.trim().length < 3}
              onChange={(e) => setEditing({ ...editing, reason: e.target.value })} />
            {invalid && <p className="text-sm text-destructive">{t("correctInvalid")}</p>}
            <div className="flex gap-2">
              <Button type="submit" className="h-14 px-6 text-base" disabled={correct.isPending}>{t("save")}</Button>
              <Button type="button" variant="ghost" className="h-14 px-6 text-base" onClick={() => setEditing(null)}>{t("cancel")}</Button>
            </div>
          </form>
        )}

        {p.measurementHistory.length > 0 && (
          <section className="grid gap-2">
            <h2 className="font-semibold">{t("history")}</h2>
            <table className={DATA_TABLE} data-testid="measurement-history">
              <thead><tr className={DATA_HEAD_ROW}><th>{t("when")}</th><th>{t("by")}</th><th>{t("before")}</th><th>{t("after")}</th><th>{t("reason")}</th></tr></thead>
              <tbody>
                {p.measurementHistory.map((h) => (
                  <tr key={h.at} className={DATA_ROW}>
                    <td><When iso={h.at} /></td><td>{h.by}</td>
                    <td className="tabular"><MeasurementsText m={h.before} /></td>
                    <td className="tabular"><MeasurementsText m={h.after} /></td>
                    <td>{h.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="grid gap-2">
          <h2 className="font-semibold">{t("photos")}</h2>
          <div className="flex gap-2 overflow-x-auto">
            {p.photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element -- signed Storage URL
              <img key={photo.id} src={photo.url} alt={t(`photoKinds.${photo.kind}`)} className="h-24 w-32 border border-rule object-cover" />
            ))}
          </div>
          {attachable && (
            <PhotoCapture items={queueItems.filter((i) => i.parcelId === p.id)} parcelId={p.id} kind={() => "damage"} onQueued={() => {}} />
          )}
        </section>
      </div>
      <aside className="grid content-start gap-2">
        <ParcelLabel parcel={p} />
        <Button variant="outline" className="no-print h-14 px-6 text-base" onClick={printPage}>{t("print")}</Button>
      </aside>
    </div>
  );
}
