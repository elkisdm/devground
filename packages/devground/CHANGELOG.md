# @devground/devground

## 1.0.5

### Patch Changes

- Updated dependencies [bab646a]
- Updated dependencies [01f15a9]
- Updated dependencies [bab646a]
  - @devground/agents-md@1.2.1
  - @devground/husky-config@1.2.0
  - @devground/eslint-config@1.2.0

## 1.0.4

### Patch Changes

- Updated dependencies [ebeec41]
  - @devground/agents-md@1.2.0

## 1.0.3

### Patch Changes

- Updated dependencies [8669017]
  - @devground/agents-md@1.1.0

## 1.0.2

### Patch Changes

- Updated dependencies [eecadb9]
  - @devground/tsconfig@2.0.0
  - @devground/husky-config@1.1.0
  - @devground/eslint-config@1.0.2
  - @devground/prettier-config@1.0.2

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

- Updated dependencies [ff712ba]
  - @devground/prettier-config@1.0.1
  - @devground/eslint-config@1.0.1
  - @devground/tsconfig@1.0.1
  - @devground/commitlint-config@1.0.1
  - @devground/lint-staged-config@1.0.1
  - @devground/husky-config@1.0.1
  - @devground/agents-md@1.0.1
