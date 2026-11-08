# @devground/prettier-config

## 2.0.1

### Patch Changes

- 060e4ec: `engines.node` ahora es `>=22.22.1`. El mínimo real ya era ese, porque lint-staged 17 exige `>=22.22.1` (y commitlint 21 `>=22.12.0`); con Node 22.0 a 22.22.0 la instalación fallaba con ERESOLVE. Ahora lo declaramos para que el error sea claro. Además se actualizan dependencias (commander 15.1) y las de desarrollo para cerrar avisos de `pnpm audit`.

## 2.0.0

### Major Changes

- e124d86: Sube el mínimo de Node a 22 (`engines.node` pasa de `>=20` a `>=22`) y se prueba en CI con Node 22 y 24. Node 20 salió de soporte en abril de 2026. Si usas Node 20, quédate en la versión anterior o actualiza Node.

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
