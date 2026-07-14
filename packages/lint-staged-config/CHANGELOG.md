# @devground/lint-staged-config

## 1.0.2

### Patch Changes

- 8efeee1: devground-setup ahora delega toda la instalación en devground-init (implementación
  única y testeada) en vez de reimplementarla. Corrige el bug crítico de lint-staged
  (config como string en package.json) que bloqueaba todos los commits tras el
  quickstart, deja de sobreescribir/borrar archivos del usuario (AGENTS.md, CLAUDE.md,
  hooks), instala el hook commit-msg + gitleaks, ya no hardcodea pnpm e instala
  eslint-config-next en proyectos Next. Ahora corre el preset completo respetando
  "no sobreescribe archivos existentes". Requiere devground-init como dependencia.
  El README de @devground/lint-staged-config deja de recomendar la forma string rota.

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
