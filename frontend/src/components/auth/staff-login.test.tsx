import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { StaffLogin } from "./staff-login";

const build = vi.hoisted(() => ({ demo: false }));
vi.mock("@/lib/demo", () => ({ get DEMO() { return build.demo; } }));

describe("StaffLogin demo hint", () => {
  beforeEach(() => { build.demo = false; });

  it("tells demo visitors any email and password work", () => {
    build.demo = true;
    renderWithProviders(<StaffLogin />, { locale: "zh-CN" });
    expect(screen.getByText("演示版：任意邮箱和密码都可以登录。")).toBeInTheDocument();
  });

  it("shows no demo hint in a real build", () => {
    renderWithProviders(<StaffLogin />, { locale: "zh-CN" });
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.queryByText(/演示版/)).toBeNull();
  });
});
