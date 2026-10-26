import { describe, expect, it } from "vitest";
import { parseDemoSession } from "./demo-session";

describe("parseDemoSession", () => {
  it("reads the email and assurance level", () => {
    expect(parseDemoSession('{"email":"amy@example.co.nz","aal":"aal2"}')).toEqual({ email: "amy@example.co.nz", aal: "aal2" });
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["not JSON", "aal2"],
    ["JSON null", "null"],
    ["no email", '{"aal":"aal1"}'],
    ["empty email", '{"email":"","aal":"aal1"}'],
    ["unknown level", '{"email":"amy@example.co.nz","aal":"aal3"}'],
  ])("treats a %s cookie as signed out", (_case, raw) => {
    expect(parseDemoSession(raw)).toBeNull();
  });
});
