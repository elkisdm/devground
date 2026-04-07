# @devground/husky-config

Git hooks setup with Husky. Configures a pre-commit hook that runs lint-staged.

## Install

```bash
pnpm add -D @devground/husky-config husky lint-staged
```

## Usage

```bash
npx devground-husky
```

This will:
1. Initialize husky (if not already done)
2. Write a `.husky/pre-commit` hook that runs `pnpm exec lint-staged`
3. Add `"prepare": "husky"` to your `package.json`
