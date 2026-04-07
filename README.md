# devground

Opinionated development standards as installable packages. One command to set up TDD, linting, formatting, commit conventions, and AI agent rules in any project.

## Quick Start

```bash
npx devground-init
```

## Packages

| Package | Description |
|---------|-------------|
| `@devground/prettier-config` | Shared Prettier configuration |
| `@devground/eslint-config` | ESLint flat config presets (base + Next.js) |
| `@devground/tsconfig` | TypeScript configuration presets |
| `@devground/commitlint-config` | Conventional commits enforcement |
| `@devground/lint-staged-config` | Pre-commit file linting rules |
| `@devground/husky-config` | Git hooks setup (pre-commit) |
| `@devground/agents-md` | AI agent rules (AGENTS.md + symlinks for Claude, Cursor, Copilot, Gemini) |
| `devground-init` | CLI to scaffold all standards in any project |

## Individual Package Usage

Each package can be installed independently:

```bash
# Prettier
pnpm add -D @devground/prettier-config
# In package.json: "prettier": "@devground/prettier-config"

# ESLint (Next.js)
pnpm add -D @devground/eslint-config
# In eslint.config.mjs: import nextConfig from "@devground/eslint-config/next"

# TypeScript
pnpm add -D @devground/tsconfig
# In tsconfig.json: "extends": "@devground/tsconfig/next.json"

# Commitlint
pnpm add -D @devground/commitlint-config
# In commitlint.config.js: extends: ["@devground/commitlint-config"]

# Lint-staged
pnpm add -D @devground/lint-staged-config
# In package.json: "lint-staged": "@devground/lint-staged-config"

# Husky
npx @devground/husky-config

# AGENTS.md
npx @devground/agents-md
```

## Development Rules Included

1. **TDD Strict** — Red, Green, Refactor. Tests first, always.
2. **Conventional Commits** — `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`
3. **Continuous Documentation** — Code comments, JSDoc, commit messages, docs/
4. **Testing Pyramid** — Many unit tests, few E2E tests
5. **Zero Dead Code** — Delete, never comment out
6. **Consistent Error Handling** — Try-catch in routes, descriptive errors in services
7. **ADR** — Architecture Decision Records in `docs/ADR/`
8. **Directory READMEs** — README.md in complex directories
9. **Semantic Tokens** — No hardcoded colors in UI components
10. **`cn()` Helper** — Mandatory for CSS class merging

## License

MIT
