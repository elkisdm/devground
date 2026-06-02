# @devground/logger

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
