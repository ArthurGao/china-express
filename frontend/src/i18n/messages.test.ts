import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import zhCN from "../../messages/zh-CN.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("message dictionaries", () => {
  it("en and zh-CN define exactly the same keys", () => {
    const enKeys = keys(en).sort();
    const zhKeys = keys(zhCN).sort();
    expect(zhKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
    expect(enKeys.filter((k) => !zhKeys.includes(k))).toEqual([]);
  });

  it("has no empty strings", () => {
    const empty = (dict: Record<string, unknown>) =>
      keys(dict).filter((k) => k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], dict) === "");
    expect(empty(en)).toEqual([]);
    expect(empty(zhCN)).toEqual([]);
  });
});
