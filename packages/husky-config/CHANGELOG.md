# @devground/husky-config

## 2.1.0

### Minor Changes

- 4e0fb2c: Cada bloqueo de los hooks cierra con un mensaje en lenguaje simple: qué pasó, que los cambios no se perdieron y qué pedirle al agente para resolverlo sin desactivar el control. Aplica al lint del pre-commit, al formato del mensaje de commit (con un ejemplo), a gitleaks y al aviso de cobertura del pre-push.

  Los hooks se copian una sola vez y nunca se sobrescriben. Para recibir los mensajes nuevos en un proyecto que ya los tiene, borra `.husky/pre-commit`, `.husky/commit-msg` y `.husky/pre-push` (si no los modificaste) y vuelve a correr `npx devground-husky`.

## 2.0.2

### Patch Changes

- 060e4ec: `engines.node` ahora es `>=22.22.1`. El mínimo real ya era ese, porque lint-staged 17 exige `>=22.22.1` (y commitlint 21 `>=22.12.0`); con Node 22.0 a 22.22.0 la instalación fallaba con ERESOLVE. Ahora lo declaramos para que el error sea claro. Además se actualizan dependencias (commander 15.1) y las de desarrollo para cerrar avisos de `pnpm audit`.

## 2.0.1

### Patch Changes

- 5c25d2f: El instalador ya no sobrescribe la configuración existente: deja de correr `npx husky init`, que reemplazaba sin preguntar `scripts.prepare` y `.husky/pre-commit` antes de que se comprobara qué respetar. Ahora solo activa husky (`core.hooksPath`), agrega `prepare` si falta y escribe únicamente los hooks ausentes. En una segunda pasada no informa escrituras, así la CLI reporta `skipped`.

## 2.0.0

### Major Changes

- e124d86: Sube el mínimo de Node a 22 (`engines.node` pasa de `>=20` a `>=22`) y se prueba en CI con Node 22 y 24. Node 20 salió de soporte en abril de 2026. Si usas Node 20, quédate en la versión anterior o actualiza Node.

## 1.3.0

### Minor Changes

- b4f2988: Los hooks pre-commit y commit-msg ya no hardcodean "pnpm exec": usan un runner
  agnóstico del package manager (npx --no-install), así los commits funcionan en
  proyectos npm/yarn (antes fallaban con exit 127). commit-msg además reporta el
  diagnóstico correcto cuando commitlint falta. Y un pre-commit / commit-msg /
  pre-push o un script "prepare" preexistentes ya no se sobreescriben. Corrige
  además un caso encontrado en la verificación e2e: en un proyecto nuevo,
  "husky init" crea su propio placeholder en .husky/pre-commit ("npm test"), que
  el guard trataba como un hook real y nunca lo reemplazaba por lint-staged +
  gitleaks — ahora ese placeholder específico se limpia antes de instalar los
  hooks reales, sin tocar un hook genuino del usuario.

## 1.2.0

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

## 1.1.0

### Minor Changes

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
