"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAssuranceLevel, useSession } from "@/lib/auth/use-session";
import { activeModule, isClosedLaterStage } from "@/lib/staff/modules";
import { useStaffMe } from "@/lib/staff/use-staff-me";

/**
 * One place for staff page access in the browser: a module's pages render only for its role, and stage 3 pages only once
 * later stages are on. The proxy already requires aal2; the backend authorises every call regardless.
 */
export function StaffRouteGuard({ children }: { children: React.ReactNode }) {
  const t = useTranslations("staffNav");
  const pathname = usePathname();
  const current = activeModule(pathname);
  const verified = useAssuranceLevel(useSession()) === "aal2";
  const me = useStaffMe(verified && current !== undefined);
  if (!current) return children; // login and the /staff landing
  if (isClosedLaterStage(pathname)) return <p className="px-4 py-6" role="note">{t("laterStage")}</p>;
  if (!me.data) return null;
  if (!me.data.roles.includes(current.role)) return <p className="px-4 py-6" role="alert">{t("noAccess")}</p>;
  return children;
}
