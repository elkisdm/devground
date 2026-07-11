# @devground/eslint-config

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
