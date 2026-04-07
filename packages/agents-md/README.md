# @devground/agents-md

AI agent development rules as AGENTS.md — the universal format recognized by Claude Code, Cursor, GitHub Copilot, and Gemini CLI.

## Install

```bash
npx @devground/agents-md
```

Or as a dependency:

```bash
pnpm add -D @devground/agents-md
npx devground-agents
```

## What it does

1. Copies `AGENTS.md` to your project root with 10 development rules
2. Creates symlinks so every AI coding agent reads the same rules:
   - `CLAUDE.md` → `AGENTS.md`
   - `.cursorrules` → `AGENTS.md`
   - `.github/copilot-instructions.md` → `AGENTS.md`
   - `.gemini/styleguide.md` → `AGENTS.md`

## Rules Included

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

## Customization

After running the setup, edit `AGENTS.md` directly. The symlinks ensure all agents pick up your changes automatically.

## Windows Support

On Windows without symlink permissions, the setup falls back to copying the file instead of symlinking.
