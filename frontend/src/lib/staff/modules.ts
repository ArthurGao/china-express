import type { components } from "@/lib/api/generated/schema";

export type StaffRole = components["schemas"]["StaffRole"];

export type StaffPage = { href: string; label: string; stage?: 3 };
export type StaffModule = { key: string; role: StaffRole; prefix: string; pages: StaffPage[] };

// The staff console's modules, each shown only to its role (GET /staff/me). The backend still authorises every call.
// `label` keys live under `staffNav.pages`; the module title under `staffNav.modules`.
export const STAFF_MODULES: StaffModule[] = [
  {
    key: "warehouse",
    prefix: "/staff/warehouse",
    role: "warehouse",
    pages: [
      { href: "/staff/warehouse", label: "receive" },
      { href: "/staff/warehouse/unclaimed", label: "unclaimed" },
      { href: "/staff/warehouse/consolidations", label: "consolidations" },
      { href: "/staff/warehouse/dispatch", label: "dispatch" },
    ],
  },
  {
    key: "ops",
    prefix: "/staff/ops",
    role: "nz_ops",
    pages: [
      { href: "/staff/ops", label: "dashboard" },
      { href: "/staff/ops/search", label: "search" },
      { href: "/staff/ops/unclaimed", label: "assign" },
      { href: "/staff/ops/price-adjustments", label: "adjustments" },
      { href: "/staff/ops/leads", label: "leads" },
      { href: "/staff/ops/notifications", label: "deliveries" },
    ],
  },
  {
    key: "finance",
    prefix: "/staff/finance",
    role: "finance",
    pages: [
      { href: "/staff/finance", label: "receivables" },
      { href: "/staff/finance/payments", label: "payments" },
      { href: "/staff/finance/overrides", label: "overrides" },
      { href: "/staff/finance/reconciliation", label: "reconciliation", stage: 3 },
    ],
  },
  {
    key: "admin",
    prefix: "/staff/admin",
    role: "admin",
    pages: [
      { href: "/staff/admin/rates", label: "rates" },
      { href: "/staff/admin/fcl-rates", label: "fclRates", stage: 3 },
      { href: "/staff/admin/staff", label: "staff" },
      { href: "/staff/admin/audit", label: "audit" },
      { href: "/staff/admin/reports", label: "reports", stage: 3 },
    ],
  },
];

// Stage 3 pages stay out of the navigation until stage 3 ships (frontend AGENTS.md: hide later-stage features); the
// demo shows everything, and NEXT_PUBLIC_LATER_STAGES=enabled turns them on for staging.
const LATER_STAGES = process.env.NEXT_PUBLIC_DEMO === "enabled" || process.env.NEXT_PUBLIC_LATER_STAGES === "enabled";

/** A stage 3 page while later stages are off: its route is closed, not just missing from the navigation. */
export function isClosedLaterStage(pathname: string, laterStages = LATER_STAGES): boolean {
  if (laterStages) return false;
  return STAFF_MODULES.some((m) => m.pages.some((p) => p.stage !== undefined && (pathname === p.href || pathname.startsWith(`${p.href}/`))));
}

export function visiblePages(module: StaffModule, laterStages = LATER_STAGES): StaffPage[] {
  return module.pages.filter((p) => laterStages || p.stage === undefined);
}

export function modulesFor(roles: readonly StaffRole[]): StaffModule[] {
  return STAFF_MODULES.filter((m) => roles.includes(m.role));
}

/** The module that owns `pathname`. */
export function activeModule(pathname: string): StaffModule | undefined {
  return STAFF_MODULES.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
