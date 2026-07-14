# @devground/devground

## 2.0.0

### Major Changes

- 8efeee1: devground-setup ahora delega toda la instalación en devground-init (implementación
  única y testeada) en vez de reimplementarla. Corrige el bug crítico de lint-staged
  (config como string en package.json) que bloqueaba todos los commits tras el
  quickstart, deja de sobreescribir/borrar archivos del usuario (AGENTS.md, CLAUDE.md,
  hooks), instala el hook commit-msg + gitleaks, ya no hardcodea pnpm e instala
  eslint-config-next en proyectos Next. Ahora corre el preset completo respetando
  "no sobreescribe archivos existentes". Requiere devground-init como dependencia.
  El README de @devground/lint-staged-config deja de recomendar la forma string rota.

### Patch Changes

- Updated dependencies [9c015c6]
- Updated dependencies [8efeee1]
- Updated dependencies [b4f2988]
- Updated dependencies [8d7f86c]
- Updated dependencies [82176e2]
  - @devground/agents-md@1.3.0
  - @devground/lint-staged-config@1.0.2
  - @devground/husky-config@1.3.0
  - devground-init@1.4.0
  - @devground/tsconfig@2.1.1

## 1.1.0

### Minor Changes

- 4c97a43: Add Astro support across the toolkit.

  - `@devground/eslint-config` exposes a new `/astro` entry that wires `eslint-plugin-astro`'s recommended flat config. `eslint-plugin-astro` is declared as an optional peer dependency.
  - `@devground/tsconfig` ships two new presets: `astro.json` (dev, extends `astro/tsconfigs/strict`) and `astro-typecheck.json` (CI, disables `incremental`). `astro` is declared as an optional peer dependency.
  - `devground-init` (CLI) detects Astro projects (presence of `astro` in dependencies, after Next.js and before React) and installs the matching ESLint and TSConfig presets automatically, including a `tsconfig.typecheck.json` variant.
  - `@devground/devground` (meta `devground-setup`) mirrors the same Astro detection and writes the same configs.

  Detection precedence is now `next > astro > react > node`. Astro wins over React because any React component inside an Astro project runs as an island, so the Astro preset is the correct umbrella in that case.

### Patch Changes

- Updated dependencies [4c97a43]
  - @devground/eslint-config@1.3.0
  - @devground/tsconfig@2.1.0

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
