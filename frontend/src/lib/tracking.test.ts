import { describe, expect, it } from "vitest";
import { parseTrackingLines } from "./tracking";

describe("parseTrackingLines", () => {
  it("takes one number per line, trimming blanks and duplicates", () => {
    expect(parseTrackingLines(" SF1234567890123 \r\n\nYT9988776655\nSF1234567890123")).toEqual([
      { carrier: null, trackingNo: "SF1234567890123" },
      { carrier: null, trackingNo: "YT9988776655" },
    ]);
  });

  it("returns an empty list for empty input", () => {
    expect(parseTrackingLines("  \n ")).toEqual([]);
  });

  it("rejects the whole input if any number is outside 4–50 characters", () => {
    expect(parseTrackingLines("SF1234567890123\nSF1")).toBeNull();
    expect(parseTrackingLines("X".repeat(51))).toBeNull();
  });
});
