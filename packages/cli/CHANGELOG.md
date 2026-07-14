# devground-init

## 1.4.0

### Minor Changes

- 8d7f86c: devground-init ahora reporta honestamente en los resúmenes: los instaladores
  que delegan en un bin (husky, agents-md, architecture-guide, ui-conventions)
  cuentan como "skipped" cuando el bin no escribió nada en un re-run, en vez de
  inflar el tally. El instalador de Vitest ya no agrega el script `test:coverage`
  cuando encuentra un `vitest.config.mjs` propio sin provisionar
  `@vitest/coverage-v8` (evita un script que reventaba en runtime); en ese caso
  agrega solo `test`. En un directorio sin package.json (p. ej. un repo Swift-only)
  el CLI sale limpio con un mensaje claro en vez de correr instaladores JS que
  fallaban con ENOENT. Internamente: las dependencias de dev se instalan en UNA
  sola invocación del package manager (antes hasta 8 seriales), se removió la
  detección de stack Swift muerta, y la lógica de exit codes es ahora una función
  pura testeada.

## 1.3.0

### Minor Changes

- 4c97a43: Add Astro support across the toolkit.

  - `@devground/eslint-config` exposes a new `/astro` entry that wires `eslint-plugin-astro`'s recommended flat config. `eslint-plugin-astro` is declared as an optional peer dependency.
  - `@devground/tsconfig` ships two new presets: `astro.json` (dev, extends `astro/tsconfigs/strict`) and `astro-typecheck.json` (CI, disables `incremental`). `astro` is declared as an optional peer dependency.
  - `devground-init` (CLI) detects Astro projects (presence of `astro` in dependencies, after Next.js and before React) and installs the matching ESLint and TSConfig presets automatically, including a `tsconfig.typecheck.json` variant.
  - `@devground/devground` (meta `devground-setup`) mirrors the same Astro detection and writes the same configs.

  Detection precedence is now `next > astro > react > node`. Astro wins over React because any React component inside an Astro project runs as an island, so the Astro preset is the correct umbrella in that case.

## 1.2.0

### Minor Changes

- bab646a: Add the `ui-conventions` installer: installs `@devground/ui-conventions` and runs its bin,
  only when a React/Next.js frontend is detected. Auto-skips (left untouched) on non-frontend
  (Node/library) stacks.
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

## 1.1.0

### Minor Changes

- 01762b2: Fase 5 de la iniciativa iOS/Swift: añade `@devground/swift-ci` (plantillas GitHub Actions + Fastlane Match) y detección de stack Swift en `devground-init` — `detectStack` ahora marca `hasSwift` cuando encuentra `Package.swift`/`.xcodeproj`/`.xcworkspace` y tolera repos Swift sin `package.json` sin fallar (ADR-0021).

## 1.0.4

### Patch Changes

- 3f0d6a1: Fix: in a non-interactive environment (CI, piped stdin, some IDE terminals)
  `devground-init` no longer errors out with a hard exit 1 when no `--preset`/`--yes`
  is given. It now defaults to the full preset and logs that choice. The write-guard
  still skips existing files, so re-running on an already-configured project stays
  safe. Use `--preset agents-only` or `--yes` to choose explicitly.

## 1.0.3

### Patch Changes

- 8cb5936: Arregla bugs que rompían la promesa de uso del CLI (hallados y re-verificados auditando el flujo con @devground/deepcheck):
  - **No sobreescribe tus configs.** Los instaladores de archivo de config (ESLint, Commitlint, TypeScript, lint-staged) ahora respetan un archivo preexistente: lo dejan intacto **y no instalan dependencias**, en vez de truncar tu config mientras dicen haberla respetado. Prettier respeta una clave `"prettier"` previa.
  - **lint-staged queda realmente configurado.** Antes escribía `"lint-staged": "@devground/lint-staged-config"` (un string) en package.json, que lint-staged rechaza en runtime. Ahora escribe `lint-staged.config.cjs` que re-exporta el config compartido.
  - **El código de salida refleja los fallos.** Si algún instalador falla, el CLI reporta el conteo real y sale con código distinto de 0 (antes siempre salía 0, ocultando fallos en CI).
  - **`--version` reporta la versión real** leída del package.json, no un literal hardcodeado.
  - **`--preset` inválido falla con un error claro** (`exit 1`) en vez de caer en silencio al prompt interactivo.
  - **Entornos no interactivos (CI / stdin sin TTY)** ahora exigen `--yes` o `--preset` y fallan con mensaje claro, en vez de salir con éxito habiendo instalado cero herramientas.
  - **Los errores de lectura de package.json** se reportan con su causa real (parse/permisos) en vez de culpar siempre a un manifest ausente.
  - **Docs sincronizadas** con el comportamiento real (tabla del CLI incluye Architecture guide; el inventario lista `lint-staged.config.cjs`).
  - **`package.json` inválido (no-objeto) falla con un error claro.** Un `package.json` que es JSON válido pero no un objeto plano (`[]`, escalar, `null`) ya no causa pérdida de datos (un array pasaba el guard y se truncaba al reescribir), ni un `TypeError` engañoso, ni un falso "archivo ausente". `readPackageJson` ahora valida en la raíz y lanza `package.json is not a valid object (got <tipo>)`.
  - **El resumen final ya no cuenta los instaladores omitidos como exitosos.** Antes "N tool(s) configured successfully" incluía los que se saltaron por config preexistente. Ahora el CLI cuenta `installed` / `skipped` / `failed` por separado y reporta honestamente (ej: "2 configured, 1 skipped (already present)"); el `exit 1` sigue solo si hubo fallos.

## 1.0.2

### Patch Changes

- Updated dependencies [38a68ec]
  - @devground/logger@0.2.0

## 1.0.1

### Patch Changes

- ff712ba: Initial public release of the devground toolkit.

  Publishes the 9 packages to the npm registry for the first time:

  - `@devground/devground` — all-in-one meta-package
  - `@devground/prettier-config` — shared Prettier configuration
  - `@devground/eslint-config` — ESLint flat config (base + Next.js)
  - `@devground/tsconfig` — TypeScript presets (base, next, next-typecheck, node)
  - `@devground/commitlint-config` — conventional commits configuration
  - `@devground/lint-staged-config` — staged-files linting rules
  - `@devground/husky-config` — git hooks setup
  - `@devground/agents-md` — AGENTS.md + multi-agent symlinks
  - `@devground/architecture-guide` — knowledge base + ADR generator
  - `devground-init` — interactive CLI scaffolder

  All packages now expose `publishConfig.access: public`, declare `engines.node >= 20`, and point to the correct GitHub repository (`elkisdm/devground`).
