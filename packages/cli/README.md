# devground-init

CLI to scaffold [@devground](https://github.com/devground) development standards into any project.

## Usage

```bash
npx devground-init
```

### Options

| Flag | Description |
|------|-------------|
| `--preset full` | Install all tools without prompts |
| `--preset agents-only` | Install only AGENTS.md + symlinks |
| `-y, --yes` | Skip prompts, install everything |
| `-V, --version` | Output version |
| `-h, --help` | Display help |

### Non-interactive environments (CI, piped stdin, some IDE terminals)

The interactive picker needs a TTY. When there isn't one, `devground-init` **defaults
to the full preset** and logs that it did so, instead of failing. Pass `--preset
agents-only` or `--yes` to be explicit. Re-running stays safe — existing configs are
left untouched (see below).

## What it does

1. **Detects your stack** -- framework (Next.js / React / Node), TypeScript, and package manager.
2. **Prompts for tool selection** — or installs the full preset when run with `--yes`,
   `--preset`, or in a non-interactive environment.
3. **Installs and configures** each selected tool:

| Tool | What it does |
|------|-------------|
| Prettier | Installs `@devground/prettier-config` and sets `"prettier"` in package.json |
| ESLint | Installs `@devground/eslint-config`, writes `eslint.config.mjs` (Next.js variant if applicable) |
| TypeScript | Installs `@devground/tsconfig`, writes `tsconfig.json` (+ `tsconfig.typecheck.json` for Next.js) |
| Commitlint | Installs `@devground/commitlint-config`, writes `commitlint.config.js` |
| lint-staged | Installs `@devground/lint-staged-config`, writes `lint-staged.config.cjs` (re-exports the shared config; a bare package.json string is rejected by lint-staged at runtime) |
| Husky | Installs `@devground/husky-config`, runs `npx devground-husky` to set up hooks |
| AGENTS.md | Installs `@devground/agents-md`, runs `npx devground-agents` to scaffold AI agent files |
| Architecture guide | Installs `@devground/architecture-guide`, runs `npx devground-architecture` to scaffold the knowledge base + ADR templates |

> **Existing configs are left untouched.** Each config-file installer (ESLint, TypeScript, Commitlint, lint-staged) skips — installing nothing — if its target file already exists; Prettier skips if a `"prettier"` key is already present. The delegating installers (Husky, AGENTS.md, Architecture guide) defer to their own binaries.

## Development

```bash
pnpm install
pnpm build   # compile TypeScript
pnpm dev     # watch mode
```
