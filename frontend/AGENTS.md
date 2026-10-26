# frontend — Agent Guide

Next.js app: customer site (English, mobile first) and staff console under `/staff` (warehouse in Chinese,
ops/admin/finance zh/en). Read the root `AGENTS.md` first. Design: `docs/design/07-frontend.md`, plus
`05-api.md` (endpoints), `06-auth.md` (login), `08-notifications-realtime.md` (SSE).
Prototype for flows and customer copy: https://gleeful-eclair-72d527.netlify.app/test.html (reference only).

## Layout (create at T1.1)

```
frontend/
  openapi/openapi.json          # the API contract: hand-maintained until the backend exists (ADR 0003)
  messages/en.json  messages/zh-CN.json
  src/
    app/
      (customer)/ …             # see 07-frontend.md routes
      staff/ …                  # login, admin/rates, warehouse, ops, finance
    components/ui/              # shadcn/ui
    components/…                # feature components
    lib/api/                    # generated client + TanStack Query hooks (do not hand-edit generated files)
    lib/supabase/               # @supabase/ssr browser/server clients — AUTH ONLY
    lib/live/                   # SSE over fetch (Authorization header), Last-Event-ID resume, query invalidation
    lib/photos/                 # photo compression + IndexedDB upload queue (warehouse)
    lib/staff/                  # staff modules per role, /staff/me
    lib/in-app-browser.ts       # detect FB/Messenger/WhatsApp/Instagram webviews
    proxy.ts                    # Next 16 name for middleware: session refresh, route guard, locale area
    mocks/                      # MSW handlers serving the contract's examples (dev/test only, never shipped)
  tests/                        # Playwright e2e
```

## Rules

- **No pricing logic.** Never import rate tables, never multiply/round money, never compute GST. Render the API's
  `lines` and `totals`. Money values are strings from the API; format with `Intl.NumberFormat` only.
- **All data through the backend API** using the generated client. `supabase-js` is for sign-in, sign-out, session
  and access token only — never `.from('table')`.
- **i18n**: every visible string via `next-intl`. Customer routes use `en`; staff routes default to `zh-CN`.
  Missing keys fail the build/test.
- **Auth UX**: show the "open in your browser" banner inside in-app browsers before login; email login uses a 6-digit
  code (no magic links); staff login requires TOTP.
- **Warehouse screens**: scanner input as keyboard wedge (auto-focused field, Enter submits); every write sends an
  `Idempotency-Key`; photos compressed client-side then uploaded to a signed URL; failed uploads go to the IndexedDB
  queue with a visible pending count; large touch targets; no Google-hosted assets (self-host fonts).
- **State**: server state in TanStack Query; SSE events invalidate queries. No global client store unless needed.
- **Forms**: react-hook-form + zod. Client validation is for UX only; the backend is the authority.
- **Accessibility & mobile**: test at 375 px width; tap targets ≥ 44 px; respect `prefers-color-scheme`.
- Do not show a feature that belongs to a later stage (e.g. online payment buttons) — hide it, don't stub fake data.
  Stage 3 staff pages are built but hidden from the nav unless `NEXT_PUBLIC_DEMO` or `NEXT_PUBLIC_LATER_STAGES` is
  `enabled` (`src/lib/staff/modules.ts`); online payment shows only when the API says `onlinePaymentAvailable`.

## Commands (define these scripts at T1.1)

```
pnpm dev             # next dev on 3600 against NEXT_PUBLIC_API_BASE_URL
pnpm dev:mock        # same, with MSW serving the contract examples (no backend needed)
pnpm build
pnpm check:bundle    # after build: fails if MSW or the demo sign-in leaked into the production bundle
pnpm build:demo      # demo build (ADR 0004): contract examples + in-browser sign-in, no backend, no Supabase
pnpm e2e:demo        # playwright against the demo build in .next-demo on 3602 (no Supabase needed)
pnpm typecheck       # next typegen + tsc
pnpm lint
pnpm lint:api        # redocly lint of openapi/openapi.json
pnpm test            # vitest
pnpm e2e             # playwright: production build in .next-e2e on 3601 (iPhone, Pixel, desktop)
pnpm gen:api         # generate src/lib/api/generated from openapi/openapi.json
pnpm supabase:start  # local Supabase Auth + Mailpit (Docker); required by dev login and e2e
```

Local setup: `pnpm install`, `pnpm supabase:start`, copy `.env.example` to `.env.local` and fill
`NEXT_PUBLIC_SUPABASE_ANON_KEY` with the PUBLISHABLE_KEY from `pnpm supabase:status -o json`, then `pnpm dev:mock`.

## Lessons specific to this app

- Money is formatted from strings with `formatMoney()` (`Intl.NumberFormat` string input); `toMoneyString()` only pads
  what a customer typed. ESLint (`eslint.config.mjs`, AGENTS.md rule 1 block) fails on parseFloat, toFixed, Math
  rounding, `Number()`, arithmetic on money-like names or a GST constant in production source.
- After sign-in or TOTP verification navigate with `hardNavigate()` (`src/lib/navigation.ts`), not `router.replace`:
  production prefetch can cache a signed-out / `aal1` redirect. Staff links render only at `aal2` for the same reason.
- Tests: build mock URLs with `apiUrl()` and answer with `exampleHandler()` / `spyOn()` from `src/mocks/handlers.ts`
  (path, method and status come from the contract); compare formatted money with `normalizeSpaces()`.
- openapi-fetch must resolve `fetch` per call (see `lib/api/client.ts`) or MSW cannot intercept it.
- Next's route announcer also has `role="alert"`; scope alert queries in e2e by text.

## Testing expectations

- Component tests for quote form, pre-notice form (prohibited-goods ack required), in-app browser banner.
- Playwright: login → quote → pre-notice on an iPhone viewport; staff login with TOTP; from stage 2, customer +
  warehouse in two browser contexts (receive a parcel, customer sees it within 5 s).
- Tamper test: modify quote request payload in the browser; the displayed result must match the server's.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
