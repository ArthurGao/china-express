import { describe, expect, it } from "vitest";
import { formatMoney, toMoneyString } from "./money";

describe("toMoneyString", () => {
  it("pads what the customer typed to two decimals without arithmetic", () => {
    expect(toMoneyString("250")).toBe("250.00");
    expect(toMoneyString("250.5")).toBe("250.50");
    expect(toMoneyString(" 0999.99 ")).toBe("999.99");
    expect(toMoneyString("0")).toBe("0.00");
  });

  it("refuses anything that is not a plain amount", () => {
    expect(toMoneyString("1,000")).toBeNull();
    expect(toMoneyString("12.345")).toBeNull();
    expect(toMoneyString("-5")).toBeNull();
    expect(toMoneyString("")).toBeNull();
  });
});

const normalise = (s: string) => s.replace(/ /g, " ");

describe("formatMoney", () => {
  it("formats an API amount string with its currency code", () => {
    expect(normalise(formatMoney("2455.65", "NZD"))).toBe("NZD 2,455.65");
    expect(normalise(formatMoney("6818.00", "USD"))).toBe("USD 6,818.00");
  });

  it("keeps every digit of the string (never goes through a JS number)", () => {
    // 9007199254740993 is not representable as a double; Number() would print ...992.
    expect(normalise(formatMoney("9007199254740993.01", "NZD"))).toBe("NZD 9,007,199,254,740,993.01");
  });

  it("rejects anything that is not a two-decimal money string", () => {
    expect(() => formatMoney("26", "NZD")).toThrow("Not a money string");
    expect(() => formatMoney("26.0", "NZD")).toThrow("Not a money string");
  });
});
