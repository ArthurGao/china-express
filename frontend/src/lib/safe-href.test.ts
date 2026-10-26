import { describe, expect, it } from "vitest";
import { safeHref } from "./safe-href";

describe("safeHref", () => {
  it.each([
    ["https://track.example/CE-S2610-0002", "https://track.example/CE-S2610-0002"],
    ["/shipments/0193?tab=1", "/shipments/0193?tab=1"],
    ["/demo/invoice.pdf", "/demo/invoice.pdf"],
  ])("keeps %s", (input, expected) => {
    expect(safeHref(input)).toBe(expected);
  });

  it.each([
    ["javascript:alert(1)"], ["JavaScript:alert(1)"], [" javascript:alert(1)"], ["data:text/html,<script>alert(1)</script>"],
    ["http://track.example/x"], ["//evil.example/x"], ["/.//evil.example"], ["/a/..//evil.example"], ["/%2e//evil.example"], ["/\t/evil.example"], ["/\\evil.example"], [""], [null],
  ])("refuses %s", (input) => {
    expect(safeHref(input)).toBeNull();
  });
});
