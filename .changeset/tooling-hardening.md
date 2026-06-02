---
"@devground/tsconfig": minor
"@devground/husky-config": minor
"@devground/eslint-config": patch
"@devground/prettier-config": patch
---

Harden the shared tooling presets so the standards enforce themselves.

- **tsconfig**: the Next preset now sets `strict: true` + `moduleResolution: bundler` (it previously disabled strict, contradicting the no-`any` standard); base enables `noUncheckedIndexedAccess`. A `next-loose.json` escape hatch is provided for gradual migration. NOTE: consumers of the Next preset may surface new strict-mode type errors and must fix them or extend `next-loose`.
- **husky-config**: adds a `commit-msg` hook that runs commitlint (the commitlint config was previously never invoked); `pre-commit` runs gitleaks before lint-staged.
- **eslint-config**: declares `@typescript-eslint/parser` as an optional peer and wires it so the no-`any` rule applies to TypeScript; adds `max-lines`/`max-lines-per-function` warnings.
- **prettier-config**: `trailingComma: "all"` (Prettier 3 default).
