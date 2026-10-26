import { describe, expect, it } from "vitest";
import { parseTheme, resolveTheme } from "./theme";

describe("theme", () => {
  it("defaults to light for a missing or unknown cookie", () => {
    expect(parseTheme(undefined)).toBe("light");
    expect(parseTheme("purple")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("follows the device only when the viewer chose system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
