"use client";

import { ErrorText } from "@/components/feedback";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DATA_HEAD_ROW, DATA_TABLE, WH_ROW } from "@/components/rates/data-table";
import { Button } from "@/components/ui/button";
import { When } from "@/components/when";
import { $api, idem } from "@/lib/api/client";

/** Released shipments leaving Guangzhou (released → dispatched, which cannot be undone). */
export function DispatchQueue() {
  const t = useTranslations("warehouse.dispatch");
  const tq = useTranslations("quote");
  const queryClient = useQueryClient();
  const queue = $api.useQuery("get", "/wh/dispatch");
  const transition = $api.useMutation("post", "/ops/shipments/{shipmentId}/transition");
  const [selected, setSelected] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [failed, setFailed] = useState<string[]>([]);

  if (queue.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  const rows = (queue.data ?? []).filter((s) => !done.includes(s.shipmentNo));

  async function dispatchSelected() {
    const ok: string[] = [];
    const bad: string[] = [];
    for (const s of rows.filter((r) => selected.includes(r.id))) {
      try {
        await transition.mutateAsync({
          params: { path: { shipmentId: s.id }, header: idem() },
          body: { to: "dispatched", expectedVersion: s.version, reason: null },
        });
        ok.push(s.shipmentNo);
      } catch {
        bad.push(s.shipmentNo);
      }
    }
    setDone([...done, ...ok]);
    setFailed(bad);
    setSelected([]);
    if (bad.length) void queryClient.invalidateQueries({ queryKey: $api.queryOptions("get", "/wh/dispatch").queryKey });
  }

  return (
    <div className="grid gap-4 text-base">
      {rows.length === 0 ? <p className="text-muted-foreground">{t("empty")}</p> : (
        <table className={DATA_TABLE} data-testid="dispatch">
          <thead>
            <tr className={DATA_HEAD_ROW}><th className="w-14" /><th>{t("shipmentNo")}</th><th>{t("member")}</th><th>{t("product")}</th><th>{t("cartons")}</th><th>{t("released")}</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className={WH_ROW}>
                <td><label className="flex size-14 cursor-pointer items-center justify-center"><input type="checkbox" className="size-6" aria-label={t("select", { shipmentNo: s.shipmentNo })} checked={selected.includes(s.id)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, s.id] : selected.filter((x) => x !== s.id))} /></label></td>
                <td className="font-mono">{s.shipmentNo}</td>
                <td className="font-mono">{s.memberNo}</td>
                <td>{tq(`products.${s.product}`)} · {tq(`regions.${s.destinationRegion}`)}</td>
                <td className="font-mono">{s.packageNos.join(", ")}</td>
                <td><When iso={s.releasedAt} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Button className="h-14 justify-self-start px-8 text-lg" disabled={selected.length === 0 || transition.isPending} onClick={dispatchSelected}>
        {t("dispatch", { count: selected.length })}
      </Button>
      <p className="text-sm text-muted-foreground">{t("irreversible")}</p>
      {done.length > 0 && <p role="status" className="text-success">{t("done", { list: done.join(", ") })}</p>}
      {failed.length > 0 && <ErrorText>{t("failed", { list: failed.join(", ") })}</ErrorText>}
    </div>
  );
}
