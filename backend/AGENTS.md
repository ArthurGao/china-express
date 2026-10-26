# backend — Agent Guide

NestJS API that owns all business logic. Read the root `AGENTS.md` first; this file adds backend rules.
Design: `docs/design/01-architecture.md`, `02-data-model.md`, `03-state-machines.md`, `04-pricing-engine.md`,
`05-api.md`, `06-auth.md`, `08-notifications-realtime.md`, `09-billing.md`.

## Layout (create at T1.1)

```
backend/
  prisma/
    schema.prisma
    migrations/               # Prisma migrations, incl. raw SQL for RLS, triggers, grants
    seed/                     # postcodes, cities, zones, rate cards, FCL rates (from handover tables)
  src/
    main.ts                   # HTTP app
    worker.ts                 # pg-boss worker + outbox relay (separate process)
    app.module.ts
    common/                   # guards, decorators, interceptors, filters, idempotency, decimal utils, pagination
    infra/                    # prisma, supabase admin client, storage, queue (pg-boss), realtime (LISTEN/NOTIFY), mail, whatsapp
    modules/
      auth/                   # JwtGuard, RolesGuard, auth hooks (send-sms), whatsapp reverse login (after spike)
      customers/              # /me, identities, member numbers, billing entities, addresses
      staff/                  # staff users, roles
      pricing/
        engine/               # PURE functions only — no Nest, no Prisma, no Date.now()
        pricing.service.ts    # loads effective rate versions, calls engine, writes snapshots
      rates/                  # rate cards, drafts, simulate, publish
      leads/
      pre-notices/
      parcels/                # warehouse receiving, photos, unclaimed
      consolidations/
      shipments/              # shipment state machine, timeline
      billing/                # receivables, payments, allocations, refunds, invoices (PDF), release overrides
      notifications/          # events, preferences, deliveries, SSE
      audit/
      reports/
  test/                       # integration + e2e (Testcontainers)
```

## Rules

- **Pricing engine is pure.** Inputs and rate payloads in, `QuoteResult` out. Unit-test it in isolation with the
  examples and boundaries in `04-pricing-engine.md`. Never import Prisma or Nest in `pricing/engine/`.
- **Decimal everywhere** for money, weight, volume (`decimal.js`; `Prisma.Decimal` at the DB edge). Serialize money as
  strings in DTOs. A lint rule or test should fail on `number` arithmetic in `pricing/` and `billing/`.
- **State changes** only through `*StateMachine` services: check role + preconditions, then in ONE transaction update
  status + `version`, insert `shipment_events`, insert `outbox`, and audit if it is a rollback.
- **Idempotency** via `IdempotencyInterceptor` + `idempotency_keys` table (scope = route + actor). Required on
  warehouse, ops, finance and webhook writes.
- **Optimistic locking**: mutating requests send `expectedVersion`; mismatch → 409.
- **Authorization**: `@Roles()` on every staff route; staff routes require `aal2`. Customer data access always filtered
  by `customerId` in repositories. Separate response DTOs per role; the `warehouse` DTOs exclude phone, full address,
  email — add a test for each warehouse endpoint asserting those fields are absent.
- **Immutability** is enforced in the DB (triggers) — do not work around it; create new records.
- **Outbox**: modules emit domain events by inserting into `outbox` inside the business transaction. Never call email /
  WhatsApp / SSE directly from a request handler.
- **Errors**: throw domain errors with a `code`; the global filter renders RFC 7807.
- **Validation**: zod schemas with `nestjs-zod` (also drives OpenAPI). Reject unknown fields.
- **Webhooks** (WhatsApp, auth hook, later payments): verify signature first, store raw event in `webhook_events`,
  dedupe by provider event id, process idempotently.
- **Config**: typed config module; app fails to boot if a required env var is missing. No secrets in code or logs.
- **Pending decisions**: implement the ★ default as rate payload / config, mark `// DECISION(<id>)`, update
  `docs/decisions/open-items.md`. AIR pricing returns `REQUIRES_REVIEW` until B1/B2 are signed.

## Database

- `DATABASE_URL` = Supavisor pooled (port 6543, `?pgbouncer=true&connection_limit=1`) for Prisma queries.
- `DIRECT_URL` = direct (5432) for `prisma migrate`, LISTEN/NOTIFY and pg-boss.
- Prisma migrate is the only schema owner. Put RLS (`enable row level security`, no anon/authenticated policies),
  immutability triggers, `audit_logs` insert-only grants, `pg_trgm` indexes and sequences in SQL migrations.
- Never run `prisma migrate reset` or destructive SQL against staging/prod. Never edit an applied migration.

## Commands (define these scripts at T1.1)

```
pnpm dev            # nest start --watch
pnpm worker:dev     # worker process
pnpm build
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint
pnpm test           # unit (jest)
pnpm test:int       # integration with Testcontainers Postgres
pnpm db:migrate     # prisma migrate dev
pnpm db:seed
pnpm openapi        # writes openapi.json and copies to ../frontend/openapi/openapi.json
```

## Testing expectations

- Pricing: every example + boundary in doc 04; each DECISION toggled both ways via payload.
- State machines: allowed and forbidden transitions, wrong role, stale version, rollback writes audit.
- Integration: authz per role, warehouse field whitelist, idempotent retries, two concurrent receives/consolidations.
- Billing: duplicate payment record with same key does not double count; reversal and refund are separate records.
