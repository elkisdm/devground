# @devground/prettier-config

Shared Prettier configuration.

## Install

```bash
pnpm add -D @devground/prettier-config prettier
```

## Usage

In your `package.json`:

```json
{
  "prettier": "@devground/prettier-config"
}
```

Or in `.prettierrc`:

```json
"@devground/prettier-config"
```

## Rules

- Semicolons: enabled
- Single quotes: enabled
- Trailing commas: all (Prettier 3 default)
- Print width: 100
- Tab width: 2
