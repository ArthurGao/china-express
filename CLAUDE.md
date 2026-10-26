@AGENTS.md

# Claude Code notes

- At the start of a session: open `docs/design/11-stage-plan.md` to find the next unchecked task and read
  `docs/decisions/open-items.md` to know which rules are still unsigned.
- Working inside `backend/` or `frontend/` loads that folder's `CLAUDE.md` as well — follow both.
- Use plan mode for anything that changes `backend/prisma/schema.prisma`, a state machine, or more than one module.
- Good uses of subagents: (1) check pricing tests against the decision table, row by row; (2) security review of new
  endpoints (authz, data leakage to warehouse role, idempotency); (3) compare a new page with the prototype screen.
- Run the folder's checks before saying a task is done:
  `cd backend && pnpm typecheck && pnpm lint && pnpm test` / `cd frontend && pnpm typecheck && pnpm lint && pnpm test`.
- When you finish a task, tick it in the stage plan and list anything you left as `DECISION(...)`.
- Never invent business rules to fill a gap. If neither the decision table nor the design covers it, stop and ask,
  or implement the most conservative behaviour behind config and add it to `open-items.md`.
