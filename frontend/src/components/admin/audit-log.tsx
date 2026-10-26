"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { DATA_HEAD_ROW, DATA_ROW, DATA_TABLE } from "@/components/rates/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { When } from "@/components/when";
import { $api } from "@/lib/api/client";

function summary(value: Record<string, unknown> | null | undefined): string {
  return value ? Object.entries(value).map(([k, v]) => `${k}: ${String(v)}`).join(", ") : "—";
}

/** The insert-only audit log (AGENTS.md rule 6): who changed what, before and after, and why. Read only. */
export function AuditLog() {
  const t = useTranslations("admin.audit");
  const [entity, setEntity] = useState("");
  const [applied, setApplied] = useState("");
  const log = $api.useQuery("get", "/admin/audit-logs", { params: { query: applied ? { entity: applied } : {} } });
  return (
    <div className="grid gap-3">
      <form className="flex max-w-md gap-2" onSubmit={(e) => { e.preventDefault(); setApplied(entity.trim()); }}>
        <Input aria-label={t("entity")} placeholder={t("entityPlaceholder")} value={entity} onChange={(e) => setEntity(e.target.value)} />
        <Button type="submit" variant="outline">{t("filter")}</Button>
      </form>
      {log.isError && <ErrorText>{t("loadFailed")}</ErrorText>}
      <table className={DATA_TABLE} data-testid="audit">
        <thead><tr className={DATA_HEAD_ROW}><th>{t("at")}</th><th>{t("actor")}</th><th>{t("action")}</th><th>{t("entityCol")}</th><th>{t("before")}</th><th>{t("after")}</th><th>{t("reason")}</th></tr></thead>
        <tbody>
          {log.data?.items.map((e) => (
            <tr key={e.id} className={`${DATA_ROW} align-top`}>
              <td className="whitespace-nowrap"><When iso={e.at} /></td>
              <td>{e.actor}</td>
              <td className="font-mono text-xs">{e.action}</td>
              <td className="font-mono">{e.entityRef}</td>
              <td className="font-mono text-xs">{summary(e.before)}</td>
              <td className="font-mono text-xs">{summary(e.after)}</td>
              <td>{e.reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
