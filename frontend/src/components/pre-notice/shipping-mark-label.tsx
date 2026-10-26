"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { $api } from "@/lib/api/client";

// Printed alone (see .print-label in globals.css): the member number in the carton stencil face.
export function ShippingMarkLabel() {
  const t = useTranslations("preNotice.label");
  const tc = useTranslations("common");
  const { data } = $api.useQuery("get", "/me", {}, { staleTime: Infinity });
  if (!data) return null;
  return (
    <section className="grid gap-3" aria-labelledby="label-title">
      <h2 id="label-title" className="text-lg font-semibold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <div className="print-label grid place-items-center gap-2 border-2 border-foreground bg-white p-6 text-black">
        <span className="font-stencil text-sm tracking-widest uppercase">{tc("brand")}</span>
        <span className="font-stencil text-5xl" data-testid="label-member-no">{data.memberNo}</span>
      </div>
      <Button type="button" variant="outline" className="no-print h-11 justify-self-start" onClick={() => window.print()}>
        {t("print")}
      </Button>
    </section>
  );
}
