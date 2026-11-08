---
'@devground/eslint-config': patch
---

El preset `next` permite `require()` en archivos `.cjs`. Antes, el `lint-staged.config.cjs` que genera devground-init hacía fallar `eslint .` en todo proyecto Next con `@typescript-eslint/no-require-imports`. Los `.ts` y `.tsx` siguen sin poder usar `require()`.
