# @devground/lint-staged-config

Shared lint-staged configuration for pre-commit hooks.

## Install

```bash
pnpm add -D @devground/lint-staged-config lint-staged eslint prettier
```

## Usage

Crea `lint-staged.config.cjs` en la raíz de tu proyecto:

```js
module.exports = require('@devground/lint-staged-config');
```

> No uses `"lint-staged": "@devground/lint-staged-config"` en package.json:
> lint-staged >=16 rechaza esa forma en runtime (espera un objeto o función,
> no un string).

## Rules

- `*.{ts,tsx}` — ESLint fix + Prettier write
- `*.{json,md,css}` — Prettier write
