# @devground/vitest-config

## 2.0.0

### Major Changes

- a5ee105: El preset de Vitest ahora incluye `.tsx`: `test.include` pasa a `src/**/*.test.{ts,tsx}` y `coverage.include` a `src/**/*.{ts,tsx}`. Al actualizar, el porcentaje medido puede bajar (los componentes ahora cuentan) y romper el ratchet, y los tests `.test.tsx` que antes no corrían ahora corren con environment `node`. Para volver a los globs anteriores, sobreescribe `test.include` y `test.coverage.include` en tu config con `src/**/*.test.ts` y `src/**/*.ts`.

  `devground-init` detecta al instalar las raíces de código del proyecto (`src`, `app`, `lib`, `components`, `packages/*/src`) y escribe los globs de test y cobertura con esas raíces (`{ts,tsx}` en TypeScript, `{js,jsx}` en JavaScript) en vez de mirar solo `src/`.

## 1.0.0

### Major Changes

- e124d86: Sube el mínimo de Node a 22 (`engines.node` pasa de `>=20` a `>=22`) y se prueba en CI con Node 22 y 24. Node 20 salió de soporte en abril de 2026. Si usas Node 20, quédate en la versión anterior o actualiza Node.
- e124d86: El preset se prueba con Vitest 5: el peer `vitest` pasa de `>=2.0.0` a `>=5.0.0` (Vitest 5 exige Node ^22.12 o 24). La configuración y las rutas críticas no cambian; el ratchet de cobertura con `autoUpdate` funciona igual. Ojo: la cobertura v8 de Vitest 5 se mide distinto (más estricta en ramas), así que el piso de un proyecto migrado puede necesitar recalibrarse una vez.

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
