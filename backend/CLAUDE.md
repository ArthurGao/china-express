@AGENTS.md

# Claude Code notes (backend)

- Before changing `prisma/schema.prisma`, re-read `docs/design/02-data-model.md` and write the migration plan first.
- For pricing work, write/extend the tests in `src/modules/pricing/engine/__tests__/` before the implementation and
  run only those (`pnpm test -- pricing`) while iterating.
- After changing any controller or DTO, run `pnpm openapi` so the frontend client stays in sync, and mention it.
