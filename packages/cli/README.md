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

## What it does

1. **Detects your stack** -- framework (Next.js / React / Node), TypeScript, and package manager.
2. **Prompts for tool selection** (or installs all with `--yes`).
3. **Installs and configures** each selected tool:

| Tool | What it does |
|------|-------------|
| Prettier | Installs `@devground/prettier-config` and sets `"prettier"` in package.json |
| ESLint | Installs `@devground/eslint-config`, writes `eslint.config.mjs` (Next.js variant if applicable) |
| TypeScript | Installs `@devground/tsconfig`, writes `tsconfig.json` (+ `tsconfig.typecheck.json` for Next.js) |
| Commitlint | Installs `@devground/commitlint-config`, writes `commitlint.config.js` |
| lint-staged | Installs `@devground/lint-staged-config`, sets `"lint-staged"` in package.json |
| Husky | Installs `@devground/husky-config`, runs `npx devground-husky` to set up hooks |
| AGENTS.md | Installs `@devground/agents-md`, runs `npx devground-agents` to scaffold AI agent files |

## Development

```bash
pnpm install
pnpm build   # compile TypeScript
pnpm dev     # watch mode
```
