# @devground/eslint-config

## 1.4.0

### Minor Changes

- bfc1d3b: Cobertura para los dos stacks que el toolkit no alcanzaba (ADR-0035). Los dos frentes **cosechan** configuracion ya rodada en vez de inventarla.

  **`@devground/python-config@0.1.0`** (nuevo; sin entrada de version propia a proposito, para que su primer release salga como 0.1.0 y no 0.2.0): `ruff.toml`, `pytest.ini` y `.pre-commit-config.yaml` instalables con `npx @devground/python-config`, sin necesidad de `package.json`. Sale del `.pre-commit-config.yaml` de atlas — el repo mas caro del autor, Python puro, con meses de uso — incluidas sus tres decisiones no obvias: reglas de ruff conservadoras (un preset agresivo termina desactivado), ni mypy ni pytest en el hook (un gate lento se saltea con `--no-verify`), y un guard explicito contra commitear `.env` (que `detect-private-key` no ve). Agrega deteccion de FastAPI: cuando lo encuentra instala un `pytest.ini` con `asyncio_mode = auto`, sin el cual cada test asincrono se marca skipped en silencio y la suite pasa en verde sin correr nada.

  **Preset `@devground/eslint-config/tanstack`** (opt-in): se compone ENCIMA del `@tanstack/eslint-config` oficial, no lo reemplaza. Cubre dos cosas que el oficial no toca: importar el cliente de base de datos en un archivo de ruta de Start (**error** — en Start el codigo de servidor y cliente conviven, y fuera de `createServerFn()` eso empaqueta las credenciales en el bundle del navegador) y las `queryKey` literales inline (**warn** — origen habitual de la cache que no invalida, pero como error rompe repos existentes al primer lint).

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

- bab646a: Add an opt-in `./ui` preset: `jsx-a11y` accessibility rules plus parametrizable warn-level
  restrictions for native primitives (`ownComponents`) and icon imports (`iconLayer` +
  `restrictedIconPackages`).

## 1.0.2

### Patch Changes

- eecadb9: Harden the shared tooling presets so the standards enforce themselves.

  - **tsconfig**: the Next preset now sets `strict: true` + `moduleResolution: bundler` (it previously disabled strict, contradicting the no-`any` standard); base enables `noUncheckedIndexedAccess`. A `next-loose.json` escape hatch is provided for gradual migration. NOTE: consumers of the Next preset may surface new strict-mode type errors and must fix them or extend `next-loose`.
  - **husky-config**: adds a `commit-msg` hook that runs commitlint (the commitlint config was previously never invoked); `pre-commit` runs gitleaks before lint-staged.
  - **eslint-config**: declares `@typescript-eslint/parser` as an optional peer and wires it so the no-`any` rule applies to TypeScript; adds `max-lines`/`max-lines-per-function` warnings.
  - **prettier-config**: `trailingComma: "all"` (Prettier 3 default).

  BREAKING CHANGE (tsconfig): the Next preset now enables `strict` by default; consumers must fix strict-mode errors or extend `next-loose.json`.

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
