"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { DATA_HEAD_ROW, DATA_TABLE, ROW_LINK, WH_ROW } from "@/components/rates/data-table";
import { When } from "@/components/when";
import { MeasurementsText } from "./measurement-fields";
import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

type WhParcel = components["schemas"]["WhParcel"];

/** Unclaimed parcels (T2.3). Ops can pass `action` to add an assign control per row. */
export function UnclaimedList({ action }: { action?: (parcel: WhParcel) => React.ReactNode }) {
  const t = useTranslations("warehouse.unclaimed");
  const list = $api.useQuery("get", "/wh/unclaimed");
  if (list.isError) return <ErrorText>{t("loadFailed")}</ErrorText>;
  if (!list.data) return null;
  if (list.data.length === 0) return <p className="text-muted-foreground">{t("empty")}</p>;
  return (
    <table className={DATA_TABLE} data-testid="unclaimed">
      <thead>
        <tr className={DATA_HEAD_ROW}><th>{t("parcelNo")}</th><th>{t("tracking")}</th><th>{t("measurements")}</th><th>{t("received")}</th>{action && <th />}</tr>
      </thead>
      <tbody>
        {list.data.map((p) => (
          <tr key={p.id} className={WH_ROW}>
            <td><Link className={ROW_LINK} href={`/staff/warehouse/parcels/${p.id}`}>{p.parcelNo}</Link></td>
            <td className="font-mono">{[p.carrier, p.trackingNo].filter(Boolean).join(" ")}</td>
            <td className="tabular"><MeasurementsText m={p.measurements} /></td>
            <td><When iso={p.receivedAt} /></td>
            {action && <td className="relative z-10 text-right">{action(p)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
