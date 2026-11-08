---
'devground-init': patch
---

Los instaladores de eslint, prettier, vitest, commitlint y lint-staged reconocen todas las variantes de config que cada herramienta carga (`.eslintrc*`, `.prettierrc*`, `vitest.config.ts`, `vite.config.*` con `test`, `.commitlintrc*`, `.lintstagedrc*`, claves de package.json), y ya no instalan dependencias ni escriben una config competidora.
