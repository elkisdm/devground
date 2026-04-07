# @devground/lint-staged-config

Shared lint-staged configuration for pre-commit hooks.

## Install

```bash
pnpm add -D @devground/lint-staged-config lint-staged eslint prettier
```

## Usage

In your `package.json`:

```json
{
  "lint-staged": "@devground/lint-staged-config"
}
```

## Rules

- `*.{ts,tsx}` — ESLint fix + Prettier write
- `*.{json,md,css}` — Prettier write
