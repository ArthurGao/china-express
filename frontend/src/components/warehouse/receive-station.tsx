"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { $api, newIdempotencyKey } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";
import { getUploadQueue } from "@/lib/photos/upload-queue";
import { printPage } from "@/lib/print";
import { QUANTITY } from "@/lib/validation";
import { EMPTY_MEASUREMENTS, MeasurementFields, measurementsComplete, type Measurements } from "./measurement-fields";
import { ParcelLabel } from "./parcel-label";
import { PhotoCapture } from "./photo-capture";
import { useUploadQueue } from "./use-upload-queue";

type ScanResult = components["schemas"]["ScanResult"];
type WhParcel = components["schemas"]["WhParcel"];

type Draft = {
  carrier: string; trackingNo: string; pieceNo: string; measurements: Measurements;
  condition: "OK" | "DAMAGED"; damageNote: string; photoIds: string[]; idempotencyKey: string;
};

function newDraft(scan: ScanResult): Draft {
  return {
    carrier: scan.parsed.carrier ?? "", trackingNo: scan.parsed.trackingNo ?? "", pieceNo: "", measurements: EMPTY_MEASUREMENTS,
    condition: "OK", damageNote: "", photoIds: [], idempotencyKey: newIdempotencyKey(),
  };
}

/**
 * Receiving (T2.1): the scan box keeps focus for the barcode scanner (it types and presses Enter); a match fills the form;
 * the parcel is received once it is measured and at least one photo is uploaded; the label prints straight away.
 */
export function ReceiveStation() {
  const t = useTranslations("warehouse.receive");
  const tq = useTranslations("quote");
  const queueItems = useUploadQueue();
  const scan = $api.useMutation("post", "/wh/parcels/scan");
  const receive = $api.useMutation("post", "/wh/parcels");
  const scanInput = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [received, setReceived] = useState<WhParcel | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftPhotos = draft ? queueItems.filter((i) => draft.photoIds.includes(i.id)) : [];
  const uploaded = draftPhotos.filter((i) => i.state === "uploaded" && i.fileId);
  const waiting = queueItems.filter((i) => i.state !== "uploaded").length;

  function reset() {
    setCode(""); setResult(null); setDraft(null); setReceived(null); setInvalid(false); setError(null);
    scanInput.current?.focus();
  }

  function lookUp(e: React.FormEvent) {
    e.preventDefault();
    const value = code.trim();
    if (value.length < 3) return;
    setError(null); setReceived(null);
    scan.mutate({ body: { code: value } }, {
      onSuccess: (r) => { setResult(r); setDraft(r.match === "DUPLICATE" ? null : newDraft(r)); },
      onError: () => setError(t("scanFailed")),
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !result) return;
    const pieceOk = draft.pieceNo === "" || QUANTITY.test(draft.pieceNo);
    const damageOk = draft.condition === "OK" || draft.damageNote.trim().length >= 3;
    if (!measurementsComplete(draft.measurements) || !pieceOk || !damageOk || uploaded.length === 0) return setInvalid(true);
    setError(null);
    receive.mutate({
      params: { header: { "Idempotency-Key": draft.idempotencyKey } },
      body: {
        scanCode: result.code, preNoticeId: result.preNotice?.id ?? null, memberNo: result.memberNo,
        carrier: draft.carrier.trim() || null, trackingNo: draft.trackingNo.trim() || null,
        pieceNo: draft.pieceNo === "" ? null : Number.parseInt(draft.pieceNo, 10),
        measurements: draft.measurements, condition: draft.condition,
        damageNote: draft.condition === "DAMAGED" ? draft.damageNote.trim() : null,
        photoFileIds: uploaded.map((i) => i.fileId!),
      },
    }, {
      onSuccess: (parcel) => {
        void getUploadQueue().remove(uploaded.map((i) => i.id));
        setReceived(parcel); setDraft(null);
        printPage();
      },
      onError: () => setError(t("receiveFailed")),
    });
  }

  return (
    <div className="grid gap-6 text-base">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <span className={`text-sm ${waiting > 0 ? "font-semibold text-warning" : "text-muted-foreground"}`} data-testid="upload-waiting">
          {t("waiting", { count: waiting })}
        </span>
      </div>

      <form onSubmit={lookUp} className="no-print grid gap-2">
        <Label htmlFor="scan" className="text-base">{t("scanLabel")}</Label>
        <div className="flex gap-2">
          <Input id="scan" ref={scanInput} autoFocus autoComplete="off" className="h-16 font-mono text-2xl" value={code}
            onChange={(e) => setCode(e.target.value)} />
          <Button type="submit" className="h-16 px-6 text-lg" disabled={scan.isPending}>{t("lookUp")}</Button>
        </div>
      </form>

      {result && !received && (
        <section className="no-print grid gap-1 border border-rule bg-surface p-4" data-testid="scan-result" data-match={result.match}>
          <p className="font-semibold">{t(`match.${result.match}`)}</p>
          {result.memberNo && <p className="font-stencil text-4xl leading-none">{result.memberNo}</p>}
          {result.preNotice && (
            <p className="text-muted-foreground">
              {result.preNotice.reference} · {tq(`products.${result.preNotice.product}`)} · {tq(`regions.${result.preNotice.destinationRegion}`)} ·{" "}
              {result.preNotice.expectedParcels === null
                ? t("receivedSoFar", { count: result.preNotice.receivedParcels })
                : t("receivedOf", { received: result.preNotice.receivedParcels, expected: result.preNotice.expectedParcels })}
            </p>
          )}
          {result.existingParcel && (
            <Link href={`/staff/warehouse/parcels/${result.existingParcel.id}`} className="font-mono underline">{result.existingParcel.parcelNo}</Link>
          )}
        </section>
      )}

      {draft && result && (
        <form onSubmit={submit} className="no-print grid gap-5" noValidate>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-1">
              <Label htmlFor="carrier" className="text-base">{t("carrier")}</Label>
              <Input id="carrier" className="h-14 text-lg" value={draft.carrier} onChange={(e) => setDraft({ ...draft, carrier: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="tracking" className="text-base">{t("trackingNo")}</Label>
              <Input id="tracking" className="h-14 font-mono text-lg" value={draft.trackingNo} onChange={(e) => setDraft({ ...draft, trackingNo: e.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="piece" className="text-base">{t("pieceNo")}</Label>
              <Input id="piece" inputMode="numeric" className="tabular h-14 text-lg" value={draft.pieceNo}
                aria-invalid={invalid && draft.pieceNo !== "" && !QUANTITY.test(draft.pieceNo)}
                onChange={(e) => setDraft({ ...draft, pieceNo: e.target.value })} />
            </div>
          </div>
          <MeasurementFields value={draft.measurements} invalid={invalid} onChange={(measurements) => setDraft({ ...draft, measurements })} />
          <fieldset className="grid gap-2">
            <legend className="mb-1 font-medium">{t("condition")}</legend>
            <div className="flex gap-3">
              {(["OK", "DAMAGED"] as const).map((c) => (
                <label key={c} className="flex h-14 flex-1 cursor-pointer items-center justify-center gap-2 border border-rule has-checked:border-foreground has-checked:bg-surface">
                  <input type="radio" name="condition" checked={draft.condition === c} onChange={() => setDraft({ ...draft, condition: c })} className="size-5" />
                  {t(`conditions.${c}`)}
                </label>
              ))}
            </div>
            {draft.condition === "DAMAGED" && (
              <>
                <Label htmlFor="damage-note">{t("damageNote")}</Label>
                <Textarea id="damage-note" value={draft.damageNote} onChange={(e) => setDraft({ ...draft, damageNote: e.target.value })}
                  aria-invalid={invalid && draft.damageNote.trim().length < 3} />
              </>
            )}
          </fieldset>
          <PhotoCapture items={draftPhotos} kind={(i) => (i === 0 ? "label" : draft.condition === "DAMAGED" ? "damage" : "overview")}
            onQueued={(ids) => setDraft((d) => (d ? { ...d, photoIds: [...d.photoIds, ...ids] } : d))} />
          {invalid && <ErrorText>{t("incomplete")}</ErrorText>}
          {draftPhotos.length > 0 && uploaded.length < draftPhotos.length && <p className="text-sm text-warning">{t("photosUploading")}</p>}
          <Button type="submit" className="h-16 text-lg" disabled={receive.isPending}>{t("submit")}</Button>
        </form>
      )}

      <ErrorText>{error}</ErrorText>

      {received && (
        <section className="grid gap-4" data-testid="received">
          <p role="status" className="no-print text-lg font-semibold text-success">
            {t(received.status === "unclaimed" ? "doneUnclaimed" : "done", { parcelNo: received.parcelNo })}
          </p>
          <ParcelLabel parcel={received} />
          <div className="no-print flex gap-2">
            <Button variant="outline" className="h-14 px-6" onClick={printPage}>{t("printAgain")}</Button>
            <Button className="h-14 px-6" onClick={reset}>{t("next")}</Button>
          </div>
        </section>
      )}
    </div>
  );
}
