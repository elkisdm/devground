# @devground/agents-md

## 1.2.1

### Patch Changes

- bab646a: Add a pointer to `docs/ui-conventions.md` at the top of §9 (Semantic Tokens in UI), so
  projects with their own UI conventions overlay take precedence over the generic rules.

## 1.2.0

### Minor Changes

- ebeec41: Add a "Working Approach" section to AGENTS.md (and the universal PROMPT.md): behavioral guidelines to reduce common LLM coding mistakes — think before coding, simplicity first, surgical changes, and goal-driven execution.

## 1.1.0

### Minor Changes

- 8669017: Add OpenAI Codex CLI support. Codex reads `AGENTS.md` from the repo root natively
  (no symlink needed, unlike Claude/Cursor/Copilot/Gemini), so the development rules
  already apply. The setup now also writes a project-scoped `.codex/config.toml` that
  marks the project Codex-aware and aligns doc discovery (`project_doc_fallback_filenames`,
  `project_doc_max_bytes`), leaving any existing `.codex/config.toml` untouched.

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
