# @devground/agents-md

## 2.0.0

### Major Changes

- e124d86: Sube el mínimo de Node a 22 (`engines.node` pasa de `>=20` a `>=22`) y se prueba en CI con Node 22 y 24. Node 20 salió de soporte en abril de 2026. Si usas Node 20, quédate en la versión anterior o actualiza Node.

### Minor Changes

- 4130c2d: Actualiza la plantilla AGENTS.md a la práctica de 2026: estructura según el estándar abierto (Comandos, Estructura del repo, Convenciones, Pruebas), y nuevas secciones de Seguridad (contenido externo como dato, secretos, acciones destructivas, dependencias), Trabajo con agentes y Definition of Done. Las reglas de tokens semánticos y `cn()` pasan a una sección condicional para proyectos con UI con Tailwind. Corrige `docs/ADR/` a `docs/adr/`. PROMPT.md y README se alinean.

## 1.3.0

### Minor Changes

- 9c015c6: devground-agents ya nunca sobreescribe un AGENTS.md existente ni borra un
  CLAUDE.md / .cursorrules / copilot-instructions.md / styleguide.md real del
  usuario: los archivos preexistentes se respetan con aviso; solo se recrean
  symlinks propios idempotentes. Corrige además el fallback de copia (Windows sin
  symlinks) que resolvía la ruta contra el directorio PADRE del proyecto.

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
