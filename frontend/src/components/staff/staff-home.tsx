"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { modulesFor } from "@/lib/staff/modules";
import { useStaffMe } from "@/lib/staff/use-staff-me";

/** /staff: opens the first module the signed-in staff member may use. */
export function StaffHome() {
  const t = useTranslations("staffNav");
  const router = useRouter();
  const me = useStaffMe();
  const first = me.data ? modulesFor(me.data.roles)[0] : undefined;

  useEffect(() => {
    if (first) router.replace(first.pages[0].href);
  }, [first, router]);

  if (me.isError) return <p role="alert" className="px-4 py-6 text-destructive">{t("loadFailed")}</p>;
  if (me.data && !first) return <p className="px-4 py-6">{t("noRole")}</p>;
  return null;
}
