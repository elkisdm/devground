# @devground/commitlint-config

Conventional commits enforcement for commitlint.

## Install

```bash
pnpm add -D @devground/commitlint-config @commitlint/cli
```

## Usage

In `commitlint.config.js`:

```js
module.exports = { extends: ['@devground/commitlint-config'] };
```

## Allowed Types

`feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `style`, `perf`, `ci`, `revert`

## Rules

- Type is required and must be lowercase
- Subject is required
- No period at end of subject
- Header max length: 100 characters
