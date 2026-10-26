"use client";

import { $api } from "@/lib/api/client";
import type { components } from "@/lib/api/generated/schema";

/** The signed-in staff member and roles; only asked once TOTP is done (staff endpoints require aal2). */
export function useStaffMe(enabled = true) {
  return $api.useQuery("get", "/staff/me", {}, { enabled, staleTime: Infinity });
}

/** Whether the signed-in staff member holds `role` (false while loading). UI only; the backend enforces roles. */
export function useHasRole(role: components["schemas"]["StaffRole"]): boolean {
  return useStaffMe().data?.roles.includes(role) ?? false;
}
