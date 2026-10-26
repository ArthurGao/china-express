import createFetchClient, { type Middleware } from "openapi-fetch";
import createQueryClient from "openapi-react-query";
import type { paths } from "./generated/schema";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3700/api/v1";

type TokenProvider = () => Promise<string | null>;
let getAccessToken: TokenProvider = async () => null;

// The auth layer registers how to read the Supabase access token; the API client never imports Supabase itself.
export function setAccessTokenProvider(provider: TokenProvider) {
  getAccessToken = provider;
}

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = await getAccessToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
};

// Resolve fetch per call rather than capturing it at import time: MSW's Node interceptor (unit tests) patches
// globalThis.fetch after this module is imported.
export const fetchClient = createFetchClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: (request) => globalThis.fetch(request),
});
fetchClient.use(authMiddleware);

export const $api = createQueryClient(fetchClient);

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

/** A fresh `Idempotency-Key` header for one command (warehouse, ops and finance writes must carry one). */
export function idem(): { "Idempotency-Key": string } {
  return { "Idempotency-Key": newIdempotencyKey() };
}

/** HTTP status of a failed API call (openapi-react-query rejects with the problem body or response). */
export function errorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}
