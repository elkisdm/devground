# @devground/architecture-guide

## 2.0.0

### Major Changes

- e124d86: Sube el mínimo de Node a 22 (`engines.node` pasa de `>=20` a `>=22`) y se prueba en CI con Node 22 y 24. Node 20 salió de soporte en abril de 2026. Si usas Node 20, quédate en la versión anterior o actualiza Node.

## 1.0.2

### Patch Changes

- 8a9aa9d: Resincroniza el mirror `knowledge/` con la fuente en la raíz del repo: refresca
  `CASE-STUDY-devground.md` y `README.md` (que estaban congelados con un conteo viejo de ADRs)
  e incorpora los transcripts originales bajo `knowledge/sources/`.

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
