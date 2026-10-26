import { describe, expect, it } from "vitest";
import contract from "../../openapi/openapi.json";

// AGENTS.md rule 8: warehouse staff never receive a customer's phone number, email or address. The backend enforces it in
// its DTOs; this keeps the contract (and so the generated client and the mocks) honest about it.
const PERSONAL = ["email", "phone", "phoneE164", "address", "addresses", "line1", "line2", "postcode", "billingEntity"];

type Schema = { $ref?: string; properties?: Record<string, Schema>; items?: Schema; oneOf?: Schema[] };
const schemas = (contract as unknown as { components: { schemas: Record<string, Schema> } }).components.schemas;

function fieldNames(schema: Schema | undefined, seen = new Set<string>()): string[] {
  if (!schema) return [];
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop()!;
    if (seen.has(name)) return [];
    seen.add(name);
    return fieldNames(schemas[name], seen);
  }
  return [
    ...Object.entries(schema.properties ?? {}).flatMap(([key, value]) => [key, ...fieldNames(value, seen)]),
    ...fieldNames(schema.items, seen),
    ...(schema.oneOf ?? []).flatMap((s) => fieldNames(s, seen)),
  ];
}

type Operation = { tags?: string[]; operationId: string; responses: Record<string, { content?: Record<string, { schema: Schema }> }> };
const warehouseOperations = Object.values((contract as unknown as { paths: Record<string, Record<string, Operation>> }).paths)
  .flatMap((ops) => Object.values(ops))
  .filter((op) => op.tags?.includes("warehouse"));

describe("contract: warehouse least data (rule 8)", () => {
  it("covers every warehouse operation", () => {
    expect(warehouseOperations.map((op) => op.operationId)).toContain("receiveParcel");
    expect(warehouseOperations.length).toBeGreaterThanOrEqual(10);
  });

  it.each(warehouseOperations.map((op) => [op.operationId, op] as const))("%s returns no phone, email or address", (_id, op) => {
    const fields = Object.values(op.responses).flatMap((r) => Object.values(r.content ?? {}).flatMap((c) => fieldNames(c.schema)));
    expect(fields.filter((f) => PERSONAL.includes(f))).toEqual([]);
  });
});

describe("contract: URLs the browser follows (SafeUrl)", () => {
  const pattern = new RegExp((schemas as unknown as Record<string, { pattern: string }>).SafeUrl.pattern);
  it.each(["https://track.example/CE-S2610-0002", "/shipments/0193", "/demo/invoice.pdf", "/staff/ops/search?q=CE"])("allows %s", (url) => {
    expect(pattern.test(url)).toBe(true);
  });
  it.each(["javascript:alert(1)", "http://track.example/x", "//evil.example", "/.//evil.example", "/a/../b", "/%2e/x", "/\\evil", "/a//b"])(
    "refuses %s", (url) => {
      expect(pattern.test(url)).toBe(false);
    });
});
