import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiUrl } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";
import { StaffHome } from "./staff/staff-home";
import { StaffRouteGuard } from "./staff/staff-route-guard";
import { StaffNav, StaffSubNav } from "./staff-nav";

const nav = vi.hoisted(() => ({ pathname: "/staff/warehouse", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace, refresh: vi.fn(), push: vi.fn() }),
}));
// A signed-in staff member who has completed TOTP.
vi.mock("@/lib/auth/use-session", () => ({
  useSession: () => ({ user: { email: "ops@example.com" } }),
  useAssuranceLevel: () => "aal2",
  useSignOut: () => vi.fn(),
}));

function staffWithRoles(roles: string[]) {
  server.use(http.get(apiUrl("/staff/me"), () =>
    HttpResponse.json({ id: "0193a510-0000-7000-8000-00000000f002", name: "陈仓", email: "wh@example.com", roles })));
}

describe("staff navigation", () => {
  beforeEach(() => {
    nav.pathname = "/staff/warehouse";
    nav.replace.mockReset();
  });

  it("shows only the modules the staff member's roles allow", async () => {
    staffWithRoles(["warehouse", "finance"]);
    renderWithProviders(<StaffNav />, { locale: "zh-CN" });
    const modules = await screen.findByRole("navigation", { name: "模块" });
    expect(within(modules).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["仓库", "/staff/warehouse"],
      ["财务", "/staff/finance"],
    ]);
    expect(within(modules).getByRole("link", { name: "仓库" })).toHaveAttribute("aria-current", "page");
  });

  it("lists the current module's pages and marks the open one", async () => {
    nav.pathname = "/staff/warehouse/consolidations/0193a700";
    renderWithProviders(<StaffSubNav />, { locale: "zh-CN" });
    const pages = await screen.findByRole("navigation", { name: "仓库" });
    expect(within(pages).getAllByRole("link").map((a) => a.textContent)).toEqual(["扫码入库", "无主包裹", "合并作业", "发运"]);
    expect(within(pages).getByRole("link", { name: "合并作业" })).toHaveAttribute("aria-current", "page");
  });

  it("hides another module's pages from someone without its role", async () => {
    staffWithRoles(["warehouse"]);
    nav.pathname = "/staff/finance";
    renderWithProviders(<><StaffNav /><StaffSubNav /></>, { locale: "zh-CN" });
    await screen.findByRole("navigation", { name: "模块" }); // the profile has loaded
    expect(screen.queryByRole("navigation", { name: "财务" })).toBeNull();
  });

  it("sends /staff to the first module the staff member may use", async () => {
    staffWithRoles(["finance"]);
    renderWithProviders(<StaffHome />, { locale: "zh-CN" });
    await vi.waitFor(() => expect(nav.replace).toHaveBeenCalledWith("/staff/finance"));
  });

  it("explains when no role is assigned", async () => {
    staffWithRoles([]);
    renderWithProviders(<StaffHome />, { locale: "zh-CN" });
    expect(await screen.findByText("你的账号还没有分配角色，请联系管理员。")).toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it("does not render a module's page for someone without its role", async () => {
    staffWithRoles(["warehouse"]);
    nav.pathname = "/staff/finance/payments";
    renderWithProviders(<StaffRouteGuard><p>收款页面</p></StaffRouteGuard>, { locale: "zh-CN" });
    expect(await screen.findByRole("alert")).toHaveTextContent("你的账号没有此模块的权限");
    expect(screen.queryByText("收款页面")).toBeNull();
  });

  it("renders the page for someone with the role", async () => {
    staffWithRoles(["finance"]);
    nav.pathname = "/staff/finance/payments";
    renderWithProviders(<StaffRouteGuard><p>收款页面</p></StaffRouteGuard>, { locale: "zh-CN" });
    expect(await screen.findByText("收款页面")).toBeInTheDocument();
  });

  it("keeps stage 3 pages closed by URL while later stages are off", () => {
    nav.pathname = "/staff/admin/reports";
    renderWithProviders(<StaffRouteGuard><p>报表页面</p></StaffRouteGuard>, { locale: "zh-CN" });
    expect(screen.getByRole("note")).toHaveTextContent("此页面属于第 3 阶段，尚未开放。");
    expect(screen.queryByText("报表页面")).toBeNull();
  });
});
