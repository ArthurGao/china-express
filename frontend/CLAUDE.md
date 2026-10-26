@AGENTS.md

# Claude Code notes (frontend)

- If an endpoint you need is missing from `openapi/openapi.json`, do not mock it in production code — add it to the
  backend first (or note it as a blocker).
- When building a customer page, open the matching prototype page and keep its English copy and step order;
  improve layout freely.
- Run `pnpm typecheck && pnpm lint && pnpm test` before finishing; run `pnpm e2e` for flow changes.
