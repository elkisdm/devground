# @devground/vitest-config

## 0.3.0

### Minor Changes

- 01f15a9: Add the `vitest` installer: scaffolds a `vitest.config.mjs` with a coverage ratchet
  (`autoUpdate: true`, seeded at 0 so it never breaks a low-coverage repo) plus the shared
  preset's critical-path thresholds, and fills in `test`/`test:coverage` scripts without
  overwriting existing ones.

  `@devground/vitest-config` now exports `CRITICAL_GLOBS` + `CRITICAL_THRESHOLDS` (90%
  lines/functions/statements, 85% branches on money/leads/auth paths, ADR-0012) and applies
  them by default.

  `@devground/husky-config` adds a `pre-push` hook that runs `test:coverage` when present
  and warns (never blocks) if coverage falls under the ratchet or critical thresholds;
  `SKIP_COVERAGE=1` opts out. CI enforces the gate hard via `pnpm -r test:coverage`.

## 0.2.0

### Minor Changes

- 38a68ec: Two new shared packages extracted from the existing toolkit:

  - `@devground/logger` — tiny, dependency-free console logger with ANSI-colored
    levels (`header`, `log`, `info`, `success`, `warn`, `error`). Replaces the two
    near-identical local loggers that lived in `devground-init` and
    `@devground/dev-metrics`; both now consume this package via `workspace:*`.
  - `@devground/vitest-config` — shared Vitest configuration (node environment,
    no globals, `src/**/*.test.ts` include, and a v8 coverage profile that
    excludes build output, declarations and configs). Coverage is opt-in: the v8
    provider only loads with `--coverage`. `devground-init` and
    `@devground/dev-metrics` now extend it from their `vitest.config.mts`.
