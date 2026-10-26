import { describe, expect, it } from "vitest";
import { upsertById } from "./cache";

describe("upsertById", () => {
  it("replaces the item with the same id in place", () => {
    expect(upsertById({ id: "b", v: 2 })([{ id: "a", v: 1 }, { id: "b", v: 1 }])).toEqual([{ id: "a", v: 1 }, { id: "b", v: 2 }]);
  });
  it("adds a new item at the requested end", () => {
    expect(upsertById({ id: "c", v: 1 }, "start")([{ id: "a", v: 1 }])).toEqual([{ id: "c", v: 1 }, { id: "a", v: 1 }]);
    expect(upsertById({ id: "c", v: 1 })(undefined)).toEqual([{ id: "c", v: 1 }]);
  });
});
