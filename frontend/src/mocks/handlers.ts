// Dev/test only. Every response is an `examples` entry copied verbatim from openapi/openapi.json, so the mock can
// never drift from the contract and never computes anything (no prices, no totals). Handlers ignore the request
// body on purpose: they show what the backend returns for the documented example input.
import { http, HttpResponse, type HttpHandler } from "msw/http";
import contract from "../../openapi/openapi.json";
import { API_BASE_URL } from "@/lib/api/client";

type Example = { value: unknown };
type Media = { examples?: Record<string, Example> };
type Response = { content?: Record<string, Media> };
type Operation = { operationId: string; responses: Record<string, Response> };
type Contract = { paths: Record<string, Record<string, Operation>> };
type Method = "get" | "post" | "put" | "patch" | "delete";

const METHODS: Method[] = ["get", "post", "put", "patch", "delete"];

type Indexed = { path: string; method: Method; status: number; op: Operation };

// The contract walked once: operationId → where it lives and its success status.
const OPERATIONS = new Map<string, Indexed>();
for (const [path, ops] of Object.entries((contract as unknown as Contract).paths)) {
  for (const method of METHODS) {
    const op = ops[method];
    if (!op) continue;
    const code = Object.keys(op.responses).find((c) => c.startsWith("2"));
    if (!code) throw new Error(`No 2xx response for ${op.operationId}`);
    OPERATIONS.set(op.operationId, { path, method, status: Number(code), op });
  }
}

export type ExampleRef = { operationId: string; example?: string };

function operation(operationId: string): Indexed {
  const found = OPERATIONS.get(operationId);
  if (!found) throw new Error(`Unknown operationId ${operationId}`);
  return found;
}

/** The contract's example body for an operation (first example unless one is named). */
export function exampleFor({ operationId, example }: ExampleRef): unknown {
  const { op, status } = operation(operationId);
  const examples = op.responses[String(status)]?.content?.["application/json"]?.examples;
  if (!examples) return undefined;
  const picked = example ? examples[example] : Object.values(examples)[0];
  if (!picked) throw new Error(`Example "${example}" not found for ${operationId}`);
  return picked.value;
}

/** Full mock URL for a contract path ("/pre-notices/{preNoticeId}" → ".../pre-notices/:preNoticeId"). */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.replace(/\{(\w+)\}/g, ":$1")}`;
}

function respond(body: unknown, status: number) {
  return body === undefined ? new HttpResponse(null, { status }) : HttpResponse.json(body as object, { status });
}

/** One operation answered with a named example; path, method and status come from the contract. */
export function exampleHandler(ref: ExampleRef): HttpHandler {
  const { path, method, status } = operation(ref.operationId);
  return http[method](apiUrl(path), () => respond(exampleFor(ref), status));
}

/**
 * Like exampleHandler, but records each request's JSON body and headers so a test can assert what the UI sent.
 * The response is still the contract example.
 */
export function spyOn(ref: ExampleRef) {
  const { path, method, status } = operation(ref.operationId);
  const calls: { body: unknown; headers: Headers }[] = [];
  const handler = http[method](apiUrl(path), async ({ request }) => {
    const text = await request.text();
    calls.push({ body: text ? JSON.parse(text) : undefined, headers: request.headers });
    return respond(exampleFor(ref), status);
  });
  return { handler, calls };
}

export function buildHandlers(): HttpHandler[] {
  return [...OPERATIONS.keys()].map((operationId) => exampleHandler({ operationId }));
}
