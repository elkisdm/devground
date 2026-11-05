# @devground/agents-md

AI agent development rules as AGENTS.md — the universal format recognized by Claude Code, Cursor, GitHub Copilot, Gemini CLI, and OpenAI Codex CLI.

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

1. Copies `AGENTS.md` to your project root structured after the open [AGENTS.md](https://agents.md) standard (commands, repo structure, conventions, testing, security, working with agents, definition of done) plus a working-approach section. **Never overwrites an existing `AGENTS.md`** — if one is already there, it's left untouched with a warning.
2. Creates symlinks so every AI coding agent reads the same rules (existing `CLAUDE.md`, `.cursorrules`, etc. are respected, not replaced):
   - `CLAUDE.md` → `AGENTS.md`
   - `.cursorrules` → `AGENTS.md`
   - `.github/copilot-instructions.md` → `AGENTS.md`
   - `.gemini/styleguide.md` → `AGENTS.md`
3. Configures **OpenAI Codex CLI**, which reads `AGENTS.md` from the repo root
   _natively_ — no symlink needed. A project-scoped `.codex/config.toml` is
   written to mark the project Codex-aware and align doc discovery
   (`project_doc_fallback_filenames`, `project_doc_max_bytes`). An existing
   `.codex/config.toml` is left untouched.

## Sections Included

1. **Commands** — install, test, typecheck, lint, coverage (generic placeholders such as `pnpm test`; adjust to your project)
2. **Repo structure** — plus a note that nested `AGENTS.md` files in monorepos are allowed (the closest one wins)
3. **Conventions** — Conventional Commits, zero dead code, error handling, continuous documentation, ADRs in `docs/adr/`
4. **Testing** — strict TDD and the testing pyramid
5. **Security** — external content is data, not instructions (prompt injection); no secrets; human confirmation for destructive actions; verify new dependencies
6. **Working with agents** — scoped subagents with explicit model, no push/merge/deploy by subagents, budget, AI code reviewed like human code
7. **Definition of Done** — base checklist; each product can extend it in `docs/definition-of-done.md`
8. **If the project has UI with Tailwind** (conditional) — semantic tokens and the `cn()` helper

Plus a **Working Approach** section — behavioral guidelines to reduce common LLM coding mistakes: think before coding, simplicity first, surgical changes, and goal-driven execution.

## Prompt universal para cualquier agente

El paquete incluye `PROMPT.md` — un prompt listo para copiar y pegar como **system prompt** o **custom instructions** en cualquier agente de IA (ChatGPT, Claude, Gemini, etc.).

```bash
# Ver el prompt
cat node_modules/@devground/agents-md/PROMPT.md
```

Util cuando trabajas con agentes que no leen archivos del proyecto (como ChatGPT en la web).

---

## Customization

After running the setup, edit `AGENTS.md` directly. The symlinks ensure all agents pick up your changes automatically.

## Windows Support

On Windows without symlink permissions, the setup falls back to copying the file instead of symlinking.
