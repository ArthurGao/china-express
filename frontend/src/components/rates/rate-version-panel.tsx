"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { $api, idem } from "@/lib/api/client";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "./data-table";
import { PublishDialog } from "./publish-dialog";
import { SeaParcelEditor, isSeaParcelPayload, seaParcelValid } from "./sea-parcel-editor";

type Payload = Record<string, unknown>;

function PayloadView({ payload, editable, onChange }: { payload: Payload; editable: boolean; onChange?: (p: Payload) => void }) {
  const t = useTranslations("rates.draft");
  const [text, setText] = useState(() => JSON.stringify(payload, null, 2));
  const [invalid, setInvalid] = useState(false);
  if (isSeaParcelPayload(payload)) {
    return <SeaParcelEditor value={payload} readOnly={!editable} onChange={(p) => onChange?.(p)} />;
  }
  // Products without a structured editor yet (LCL, AIR, FCL): JSON, validated before it is sent.
  return (
    <div className="grid gap-1">
      <Label htmlFor="payload-json">{t("jsonLabel")}</Label>
      <Textarea id="payload-json" rows={14} className="font-mono text-xs" readOnly={!editable} value={text} aria-invalid={invalid}
        onChange={(e) => {
          setText(e.target.value);
          try { onChange?.(JSON.parse(e.target.value) as Payload); setInvalid(false); } catch { setInvalid(true); }
        }} />
      {invalid && <p className="text-destructive">{t("jsonInvalid")}</p>}
    </div>
  );
}

const cardsKey = $api.queryOptions("get", "/admin/rate-cards").queryKey;
const versionKey = (versionId: string) => $api.queryOptions("get", "/admin/rate-versions/{versionId}", { params: { path: { versionId } } }).queryKey;

/** One rate version: read-only view, new-draft editor, and simulate / publish for drafts. */
export function RateVersionPanel({ versionId, notice, onDraftCreated }: {
  versionId: string; notice?: string; onDraftCreated: (draftId: string, version: number) => void;
}) {
  const t = useTranslations("rates");
  const queryClient = useQueryClient();
  // Versions change only through this panel's own mutations, which write the cache, so no background refetch.
  const fetched = $api.useQuery("get", "/admin/rate-versions/{versionId}", { params: { path: { versionId } } }, { staleTime: Infinity });
  const createDraft = $api.useMutation("post", "/admin/rate-cards/{rateCardId}/drafts");
  const simulate = $api.useMutation("post", "/admin/rate-versions/{versionId}/simulate");
  const publish = $api.useMutation("post", "/admin/rate-versions/{versionId}/publish");

  const [editing, setEditing] = useState<{ payload: Payload; effectiveFrom: string } | null>(null);
  const [dateInvalid, setDateInvalid] = useState(false);

  const version = fetched.data;
  if (!version) return null;

  const startDraft = () => setEditing({ payload: structuredClone(version.payload), effectiveFrom: "" });

  const saveDraft = () => {
    if (!editing) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editing.effectiveFrom)) return setDateInvalid(true);
    if (isSeaParcelPayload(editing.payload) && !seaParcelValid(editing.payload)) return;
    setDateInvalid(false);
    createDraft.mutate(
      {
        params: { path: { rateCardId: version.rateCardId }, header: idem() },
        body: { basedOnVersionId: version.id, effectiveFrom: editing.effectiveFrom, payload: editing.payload },
      },
      {
        onSuccess: (draft) => {
          queryClient.setQueryData(versionKey(draft.id), draft);
          queryClient.invalidateQueries({ queryKey: cardsKey });
          onDraftCreated(draft.id, draft.version);
        },
      },
    );
  };

  const runPublish = (reason: string) =>
    publish.mutate(
      { params: { path: { versionId: version.id }, header: idem() }, body: { reason } },
      {
        onSuccess: (published) => {
          queryClient.setQueryData(versionKey(published.id), published);
          queryClient.invalidateQueries({ queryKey: cardsKey });
        },
      },
    );

  const isDraft = version.status === "draft";

  return (
    <section className="grid gap-4" data-testid="rate-version-panel">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold">{t("detail.title", { product: t(`productNames.${version.product}`), version: version.version })}</h2>
        <Badge variant={isDraft ? "outline" : "secondary"}>{t(`statuses.${version.status}`)}</Badge>
        <span className="font-mono text-xs text-muted-foreground" title={version.id}>{version.id.slice(0, 8)}</span>
      </div>

      {notice && !publish.data && <p className="text-success">{notice}</p>}
      {publish.data && <p className="text-success" role="status">{t("publish.done", { version: publish.data.version, date: publish.data.effectiveFrom })}</p>}
      {publish.isError && <p className="text-destructive" role="alert">{t("publish.failed")}</p>}

      {editing ? (
        <div className="grid gap-4 border border-rule bg-surface p-4">
          <div className="grid max-w-xs gap-1">
            <Label htmlFor="effective-from">{t("draft.effectiveFrom")}</Label>
            <Input id="effective-from" type="date" value={editing.effectiveFrom} aria-invalid={dateInvalid}
              onChange={(e) => setEditing({ ...editing, effectiveFrom: e.target.value })} className="h-8" />
            {dateInvalid && <p className="text-destructive">{t("draft.dateInvalid")}</p>}
          </div>
          <PayloadView payload={editing.payload} editable onChange={(payload) => setEditing({ ...editing, payload })} />
          <div className="flex gap-2">
            <Button size="sm" onClick={saveDraft} disabled={createDraft.isPending}>{t("draft.create")}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>{t("draft.cancel")}</Button>
          </div>
        </div>
      ) : (
        <>
          {!isDraft && <p className="text-muted-foreground">{t("detail.readOnly")}</p>}
          <PayloadView key={`${version.id}-${version.status}`} payload={version.payload} editable={false} />
          <div className="flex flex-wrap gap-2">
            {!isDraft && <Button size="sm" variant="outline" onClick={startDraft}>{t("draft.new")}</Button>}
            {isDraft && (
              <>
                <Button size="sm" variant="outline" disabled={simulate.isPending}
                  onClick={() => simulate.mutate({ params: { path: { versionId: version.id } } })}>
                  {t("simulate.run")}
                </Button>
                <PublishDialog version={version.version} effectiveFrom={version.effectiveFrom} pending={publish.isPending} onConfirm={runPublish} />
              </>
            )}
          </div>
        </>
      )}

      {simulate.data && isDraft && (
        <div className="grid gap-2" data-testid="simulation">
          <h3 className="font-semibold">{t("simulate.title", { n: simulate.data.sampleSize })}</h3>
          <p className="text-muted-foreground">
            {t("simulate.summary", { up: simulate.data.summary.increased, down: simulate.data.summary.decreased, same: simulate.data.summary.unchanged })}
          </p>
          <table className={DATA_TABLE}>
            <thead>
              <tr className={DATA_HEAD_ROW}>
                <th>{t("simulate.quote")}</th>
                <th>{t("simulate.date")}</th>
                <th>{t("simulate.region")}</th>
                <th className="text-right">{t("simulate.old")}</th>
                <th className="text-right">{t("simulate.new")}</th>
                <th className="text-right">{t("simulate.delta")}</th>
              </tr>
            </thead>
            <tbody>
              {simulate.data.rows.map((r) => (
                <tr key={r.quoteId} className={DATA_ROW}>
                  <td className="font-mono text-xs">{r.quoteId.slice(0, 8)}</td>
                  <td className="font-mono text-xs">{r.createdAt.slice(0, 10)}</td>
                  <td>{t(`editor.regionNames.${r.region}`)}</td>
                  <td className="text-right"><Money amount={r.oldTotal} currency={r.currency} /></td>
                  <td className="text-right"><Money amount={r.newTotal} currency={r.currency} /></td>
                  <td className={`text-right ${r.delta.startsWith("-") ? "text-success" : r.delta === "0.00" ? "" : "text-warning"}`}>
                    <Money amount={r.delta} currency={r.currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
