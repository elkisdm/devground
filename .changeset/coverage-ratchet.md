---
"devground-init": minor
"@devground/vitest-config": minor
"@devground/husky-config": minor
---

Add the `vitest` installer: scaffolds a `vitest.config.mjs` with a coverage ratchet
(`autoUpdate: true`, seeded at 0 so it never breaks a low-coverage repo) plus the shared
preset's critical-path thresholds, and fills in `test`/`test:coverage` scripts without
overwriting existing ones.

`@devground/vitest-config` now exports `CRITICAL_GLOBS` + `CRITICAL_THRESHOLDS` (90%
lines/functions/statements, 85% branches on money/leads/auth paths, ADR-0012) and applies
them by default.

`@devground/husky-config` adds a `pre-push` hook that runs `test:coverage` when present
and warns (never blocks) if coverage falls under the ratchet or critical thresholds;
`SKIP_COVERAGE=1` opts out. CI enforces the gate hard via `pnpm -r test:coverage`.
