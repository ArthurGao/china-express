import { describe, expect, it } from "vitest";
import { checkAccess, safeNext } from "./routes";

describe("checkAccess", () => {
  it("sends a signed-out visitor from the quote page to login, keeping where they were going", () => {
    expect(checkAccess("/quote", null)).toEqual({ allow: false, redirectTo: "/login?next=%2Fquote" });
    expect(checkAccess("/pre-notice/abc", null)).toEqual({ allow: false, redirectTo: "/login?next=%2Fpre-notice%2Fabc" });
    expect(checkAccess("/shipments/abc", null)).toEqual({ allow: false, redirectTo: "/login?next=%2Fshipments%2Fabc" });
    expect(checkAccess("/notifications", null)).toEqual({ allow: false, redirectTo: "/login?next=%2Fnotifications" });
    expect(checkAccess("/payments/result", null, "?payment=1")).toEqual({ allow: false, redirectTo: "/login?next=%2Fpayments%2Fresult%3Fpayment%3D1" });
  });

  it("lets anyone see the landing and login pages", () => {
    expect(checkAccess("/", null)).toEqual({ allow: true });
    expect(checkAccess("/login", null)).toEqual({ allow: true });
    expect(checkAccess("/terms", null)).toEqual({ allow: true });
  });

  it("lets a signed-in customer quote", () => {
    expect(checkAccess("/quote", { aal: "aal1" })).toEqual({ allow: true });
  });

  it("does not treat a path that only starts with a protected word as protected", () => {
    expect(checkAccess("/quotes-info", null)).toEqual({ allow: true });
  });

  it("requires a completed TOTP (aal2) for every staff page except staff login", () => {
    expect(checkAccess("/staff/admin/rates", null)).toEqual({ allow: false, redirectTo: "/staff/login" });
    expect(checkAccess("/staff/admin/rates", { aal: "aal1" })).toEqual({ allow: false, redirectTo: "/staff/login" });
    expect(checkAccess("/staff/admin/rates", { aal: "aal2" })).toEqual({ allow: true });
    expect(checkAccess("/staff/login", null)).toEqual({ allow: true });
  });
});

describe("safeNext", () => {
  it("accepts same-site relative paths", () => {
    expect(safeNext("/pre-notice/new")).toBe("/pre-notice/new");
  });

  it("rejects absolute and protocol-relative URLs (open redirect)", () => {
    expect(safeNext("https://evil.example")).toBe("/quote");
    expect(safeNext("//evil.example")).toBe("/quote");
    expect(safeNext("/\\evil.example")).toBe("/quote");
    expect(safeNext(null)).toBe("/quote");
  });

  it("rejects paths that browsers would turn into another origin (control characters stripped)", () => {
    expect(safeNext("/\t/evil.example")).toBe("/quote");
    expect(safeNext("/\n/evil.example")).toBe("/quote");
    expect(safeNext("/%2F%2Fevil.example")).toBe("/%2F%2Fevil.example");
  });

  it("rejects paths that only become protocol-relative after dot segments are resolved", () => {
    expect(safeNext("/.//evil.example")).toBe("/quote");
    expect(safeNext("/a/..//evil.example")).toBe("/quote");
    expect(safeNext("/%2e//evil.example")).toBe("/quote");
    expect(safeNext("/./account")).toBe("/account");
  });

  it("keeps the query and hash of a safe path", () => {
    expect(safeNext("/quote?src=fb#results")).toBe("/quote?src=fb#results");
  });
});

describe("checkAccess keeps sales-link parameters", () => {
  it("carries the query string into next", () => {
    expect(checkAccess("/quote", null, "?src=fb&ref=amy")).toEqual({ allow: false, redirectTo: "/login?next=%2Fquote%3Fsrc%3Dfb%26ref%3Damy" });
  });
});
