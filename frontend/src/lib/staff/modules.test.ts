import { describe, expect, it } from "vitest";
import { STAFF_MODULES, activeModule, modulesFor, visiblePages } from "./modules";

describe("staff modules", () => {
  it("shows a warehouse-only user just the warehouse module", () => {
    expect(modulesFor(["warehouse"]).map((m) => m.key)).toEqual(["warehouse"]);
  });

  it("orders modules the same way for every combination of roles", () => {
    expect(modulesFor(["admin", "finance", "nz_ops"]).map((m) => m.key)).toEqual(["ops", "finance", "admin"]);
  });

  it.each([
    ["/staff/warehouse", "warehouse"],
    ["/staff/warehouse/consolidations/0193", "warehouse"],
    ["/staff/ops/shipments/0193", "ops"],
    ["/staff/finance/receivables/0193", "finance"],
    ["/staff/admin/rates", "admin"],
    ["/staff/admin/audit", "admin"],
  ])("puts %s under %s", (path, key) => {
    expect(activeModule(path)?.key).toBe(key);
  });

  it("has no module for the login page", () => {
    expect(activeModule("/staff/login")).toBeUndefined();
  });

  it("keeps stage 3 pages out of the navigation unless later stages are on", () => {
    const admin = STAFF_MODULES.find((m) => m.key === "admin")!;
    expect(visiblePages(admin, false).map((p) => p.label)).toEqual(["rates", "staff", "audit"]);
    expect(visiblePages(admin, true).map((p) => p.label)).toEqual(["rates", "fclRates", "staff", "audit", "reports"]);
  });
});
