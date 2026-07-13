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

1. Copies `AGENTS.md` to your project root with 10 development rules + a working-approach section
2. Creates symlinks so every AI coding agent reads the same rules:
   - `CLAUDE.md` → `AGENTS.md`
   - `.cursorrules` → `AGENTS.md`
   - `.github/copilot-instructions.md` → `AGENTS.md`
   - `.gemini/styleguide.md` → `AGENTS.md`
3. Configures **OpenAI Codex CLI**, which reads `AGENTS.md` from the repo root
   _natively_ — no symlink needed. A project-scoped `.codex/config.toml` is
   written to mark the project Codex-aware and align doc discovery
   (`project_doc_fallback_filenames`, `project_doc_max_bytes`). An existing
   `.codex/config.toml` is left untouched.

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

Plus a **Working Approach** section — behavioral guidelines to reduce common LLM coding mistakes: think before coding, simplicity first, surgical changes, and goal-driven execution.

## Prompt universal para cualquier agente

El paquete incluye `PROMPT.md` — un prompt listo para copiar y pegar como **system prompt** o **custom instructions** en cualquier agente de IA (ChatGPT, Claude, Gemini, etc.).

```bash
# Ver el prompt
cat node_modules/@devground/agents-md/PROMPT.md
```

Util cuando trabajas con agentes que no leen archivos del proyecto (como ChatGPT en la web).

---

## Harness hooks (Claude Code)

Beyond rules-as-text, the package ships **4 curated Claude Code hooks** that make the
rules executable at *edit time* instead of commit time (inspired by ECC's hook system,
deliberately reduced to the ones that pay for themselves):

```bash
npx devground-hooks
```

| Hook | Event | What it does |
|------|-------|--------------|
| `prettier-format` | PostToolUse (Edit/Write) | Formats the edited file with the project's own Prettier |
| `typecheck` | PostToolUse (Edit/Write) | Single-file `tsc --noEmit` on the edited `.ts`/`.tsx`; real type errors are fed back to the agent (exit 2) |
| `console-log` | PostToolUse (Edit/Write) | Warns about `console.log`/`console.debug` left in product code (Zero Dead Code rule made executable) |
| `session-summary` | Stop | Appends a token-free session marker to `.claude/devground/sessions.jsonl` — input for `@devground/dreaming`'s consolidation window |

Design constraints, in order of importance:

- **Zero noise over completeness.** The typecheck is single-file on purpose (~0.9s vs
  seconds for a project-wide check); module-resolution diagnostics (TS2307/TS2792) are
  filtered out because they are artifacts of checking one file out of context — CI and
  the pre-commit pipeline still catch them.
- **A hook never breaks the session.** Missing binaries, timeouts, invalid stdin,
  unreadable files → exit 0, silently. `session-summary` always exits 0 (a Stop hook
  that exits 2 would block the session from ending).
- **Your `settings.json` is respected.** The installer copies scripts into
  `.claude/hooks/devground/` (its own namespace — re-running upgrades them) but never
  touches an existing `"hooks"` key in `.claude/settings.json`; it leaves
  `hooks.json` next to the scripts for a manual merge.

**Kill switch** (no uninstall needed):

```bash
DEVGROUND_HOOKS_DISABLE=all             # disable everything
DEVGROUND_HOOKS_DISABLE=typecheck,console-log   # disable by name
```

## Customization

After running the setup, edit `AGENTS.md` directly. The symlinks ensure all agents pick up your changes automatically.

## Windows Support

On Windows without symlink permissions, the setup falls back to copying the file instead of symlinking.
