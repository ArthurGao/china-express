# ChinaExpress — Agent Guide

China → New Zealand freight consolidation platform (集运). NZ customers get a quote, pre-notify parcels to our
Guangzhou warehouse, the warehouse receives / measures / consolidates them, the customer confirms the final price
and pays, and NZ operations ship, clear customs and deliver. Operating company: NAL (NZ).

This file is the shared guide for every coding agent. `CLAUDE.md` imports it. `backend/` and `frontend/` each have
their own guide that adds folder-specific rules.

## Repository layout

```
backend/    NestJS API — ALL business logic: pricing, state machines, auth guard, jobs, billing
frontend/   Next.js app — customer site (English) + staff console (warehouse Chinese, ops/admin zh/en)
docs/       requirements, signed decisions, design, planning — read before writing code
```

The two apps are independent pnpm projects. The only contract between them is the backend's OpenAPI spec
(`backend` exports it, `frontend` generates a typed client from it).

## Sources of truth (highest first)

1. `docs/decisions/pricing-decisions-and-entities.md` — owner-signed business rules. Signed rows override everything,
   including the original PDF. Unsigned rows: implement the ★ default, behind config, and flag it (rule 10).
2. `docs/design/*.md` — current technical design. Read `docs/README.md` for the index.
3. `docs/design/11-stage-plan.md` — task list, stage scope, acceptance per stage.
4. `docs/planning/plan.html`, `docs/planning/risks.html` — human-facing plan and risk list (read-only for agents).
5. `docs/requirements/handover-zh.pdf` — original handover. Overridden by 1–2 where they conflict.
6. Prototype (behaviour, copy and layout reference only — never copy its code):
   https://gleeful-eclair-72d527.netlify.app/test.html

If your change must contradict the design, update the design doc in the same change and add an ADR in
`docs/design/adr/` (`NNNN-title.md`: context, decision, consequences).

## Current stage

**Stage 1 — quote, login, pre-notice.** Scope and task IDs are in `docs/design/11-stage-plan.md`.
Do not build later-stage features unless the task asks for it: online payment gateways, Xero sync,
FCL rate administration, Facebook / SMS login, North Island / South Island order taking. Leave the extension
points described in the design (e.g. `PaymentProvider` interface) instead.

## Non-negotiable rules

1. **No pricing logic in the browser.** Prices come only from backend quote endpoints. The frontend displays what
   the API returns; it never multiplies, rounds or looks up a rate.
2. **Money is Decimal.** `numeric(12,2)` in Postgres, `Prisma.Decimal` / `decimal.js` in code. Never use JS `number`
   for money or weights in calculations. Every amount carries a currency. Round only at the steps listed in
   `docs/design/04-pricing-engine.md`.
3. **Immutable records.** Quote snapshots, final-price snapshots, issued invoices, payment records and audit logs are
   never updated or deleted. Corrections create new records (new snapshot, credit note, reversal entry).
4. **State changes go through the state machine services** (`docs/design/03-state-machines.md`). Never write a
   `status` column directly from a controller or another module.
5. **Idempotency.** Warehouse, ops, billing and webhook write endpoints accept an `Idempotency-Key` header and must be
   safe to retry.
6. **Audit.** Rate publish, price adjustment, status rollback, payment record / reversal, refund and account merge
   write to `audit_logs` (actor, entity, before, after, reason).
7. **Language.** Customer-facing text is English. Warehouse UI is Chinese. Every user-visible string goes through the
   i18n dictionaries — no hard-coded UI text.
8. **Least data.** Warehouse staff never receive a customer's full phone number or address. Enforce this in backend
   response DTOs, not in the UI.
9. **Secrets.** Only via environment variables. Never commit `.env*` (except `.env.example`). The Supabase
   `service_role` key and DB credentials exist only in the backend.
10. **Pending decisions.** When a rule depends on an unsigned decision, implement the ★ default as data/config, add a
    `// DECISION(<id>)` comment (e.g. `DECISION(C1)`), and make sure the item is listed in
    `docs/decisions/open-items.md`.

## Tech stack (pin exact versions in package.json at setup)

- **Supabase, Sydney region**: Postgres, Auth (customers + staff), Storage (photos, PDFs). Realtime is not used —
  realtime goes through the backend (SSE).
- **Backend**: Node.js LTS, NestJS (latest stable), TypeScript strict, Prisma, pg-boss (Postgres-backed jobs),
  SSE + Postgres LISTEN/NOTIFY, Jest, Testcontainers.
- **Frontend**: Next.js (latest stable, App Router), React, TypeScript strict, Tailwind CSS, shadcn/ui,
  TanStack Query, react-hook-form + zod, next-intl, `@supabase/ssr` (auth only), Vitest, Playwright.
- Package manager: pnpm. Node version in `.nvmrc` in each folder.

## Workflow

1. Pick the next unchecked task in `docs/design/11-stage-plan.md`; read the design docs it references.
2. For tasks that touch the DB schema or more than one module, write a short plan first.
3. Pricing engine and state machines: write the tests first, from the decision table.
4. Definition of done: typecheck, lint and tests pass; the task's acceptance items are covered by tests;
   docs updated if behaviour changed; `open-items.md` updated; task ticked in the stage plan.
5. Small commits, Conventional Commits (`feat(pricing): …`, `fix(warehouse): …`).
6. Do not edit `docs/requirements/` or `docs/planning/` — those are owned by people.

## Glossary

| 中文 | Code name | Meaning |
| --- | --- | --- |
| 会员号 / 唛头 | `memberNo` / shipping mark | `CE-123456-7`, printed on every carton |
| 预报 | `PreNotice` | customer tells us parcels are coming |
| 入库包裹 | `Parcel` | one carton physically received |
| 无主包裹 | unclaimed parcel | received but not matched to a customer |
| 合并作业 | `Consolidation` | one repacking job: parcels in, packages out |
| 拆包 | unpack | remove original courier packaging during consolidation |
| 出库包装 | `OutboundPackage` | one carton actually shipped |
| 运输货件 | `Shipment` | one dispatch; unit of final price, payment and tracking |
| 应收单 / 收款 | `Receivable` / `Payment` | amount owed / money received |
| 计费重 | chargeable weight | max(actual, volumetric), rounded per rules |
| 运费吨 RT | revenue ton | max(m³, kg/1000, 1) for LCL |
| 海运小包 / 海运拼箱 / 空运 / 整柜 | `SEA_PARCEL` / `SEA_LCL` / `AIR` / `FCL` | products |
