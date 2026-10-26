"use client";

import { ErrorText } from "@/components/feedback";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HandlingChoice } from "@/components/shipments/handling-choice";
import { $api } from "@/lib/api/client";
import { ShippingMarkLabel } from "./shipping-mark-label";
import { TrackingNumbers } from "./tracking-numbers";
import { WarehouseAddress } from "./warehouse-address";

const STEPS = ["one", "two", "three", "four"] as const;

export function PreNoticeDone({ id }: { id: string }) {
  const t = useTranslations("preNotice");
  const notice = $api.useQuery("get", "/pre-notices/{preNoticeId}", { params: { path: { preNoticeId: id } } });

  if (notice.isError) return <ErrorText>{t("errors.load")}</ErrorText>;

  return (
    <div className="grid gap-10">
      <div className="no-print">
        <h1 className="text-2xl font-semibold tracking-tight">{t("done.title")}</h1>
        <p className="mt-2 text-lg">{t("done.noPayment")}</p>
      </div>

      <section className="no-print grid gap-3">
        <h2 className="text-lg font-semibold">{t("done.stepsTitle")}</h2>
        <ol className="divide-y divide-rule border-y border-rule">
          {STEPS.map((k, i) => (
            <li key={k} className="grid grid-cols-[3rem_1fr] gap-2 py-3">
              <span className="font-stencil text-2xl leading-none text-foreground">{String(i + 1).padStart(2, "0")}</span>
              <span>{t(`done.steps.${k}`)}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted-foreground">{t("done.customs")}</p>
      </section>

      <div className="no-print"><HandlingChoice preNoticeId={id} /></div>
      <div className="no-print"><WarehouseAddress /></div>
      <ShippingMarkLabel />
      {notice.data && <div className="no-print"><TrackingNumbers notice={notice.data} /></div>}

      <Button asChild variant="outline" className="no-print h-11 justify-self-start">
        <Link href="/quote">{t("done.newQuote")}</Link>
      </Button>
    </div>
  );
}
