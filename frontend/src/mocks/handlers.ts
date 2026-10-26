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

/**
 * The contract's example body for an operation: the named one, else the one whose field for the path parameter equals
 * it (`preNoticeId` → `preNoticeId`, otherwise `id`), so a list entry opens its own detail; else the first. A lookup
 * only; nothing is computed from the request.
 */
export function exampleFor({ operationId, example }: ExampleRef, pathParams: Record<string, unknown> = {}): unknown {
  const { op, status } = operation(operationId);
  const examples = op.responses[String(status)]?.content?.["application/json"]?.examples;
  if (!examples) return undefined;
  const picked = example
    ? examples[example]
    : (Object.values(examples).find((e) => matchesPath(e.value, pathParams)) ?? Object.values(examples)[0]);
  if (!picked) throw new Error(`Example "${example}" not found for ${operationId}`);
  return picked.value;
}

function matchesPath(value: unknown, pathParams: Record<string, unknown>): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return Object.entries(pathParams).some(([name, param]) => (name in record ? record[name] : record.id) === param);
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
  return http[method](apiUrl(path), ({ params }) => respond(exampleFor(ref, params), status));
}

/**
 * Like exampleHandler, but records each request's JSON body and headers so a test can assert what the UI sent.
 * The response is still the contract example.
 */
export function spyOn(ref: ExampleRef) {
  const { path, method, status } = operation(ref.operationId);
  const calls: { body: unknown; headers: Headers }[] = [];
  const handler = http[method](apiUrl(path), async ({ request, params }) => {
    const text = await request.text();
    calls.push({ body: text ? JSON.parse(text) : undefined, headers: request.headers });
    return respond(exampleFor(ref, params), status);
  });
  return { handler, calls };
}

export function buildHandlers(): HttpHandler[] {
  return [...OPERATIONS.keys()].map((operationId) => exampleHandler({ operationId })).concat(demoFileHandlers);
}

// Files the contract examples link to (parcel photos, invoice PDFs, photo uploads). The real backend returns signed
// Supabase Storage URLs; these stand-ins exist only where MSW runs, so production builds never serve them.
const PHOTO_SVG = (label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120"><rect width="160" height="120" fill="#c9d1d0"/>` +
  `<rect x="30" y="25" width="100" height="70" fill="#b08d57" stroke="#14263a"/><text x="80" y="66" font-family="monospace" ` +
  `font-size="11" text-anchor="middle" fill="#14263a">${label}</text></svg>`;
const DEMO_PDF =
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj " +
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj " +
  "4 0 obj<</Length 52>>stream\nBT /F1 14 Tf 20 60 Td (Demo invoice - sample data) Tj ET\nendstream endobj " +
  "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";

export const demoFileHandlers: HttpHandler[] = [
  http.get("*/demo/:file", ({ params }) => {
    const file = String(params.file);
    if (file.endsWith(".pdf")) return new HttpResponse(DEMO_PDF, { headers: { "Content-Type": "application/pdf" } });
    return new HttpResponse(PHOTO_SVG(file.replace(/^parcel-|\.svg$/g, "")), { headers: { "Content-Type": "image/svg+xml" } });
  }),
  http.put("*/demo-storage/*", () => new HttpResponse(null, { status: 200 })),
];
