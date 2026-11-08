---
'@devground/agents-md': patch
'@devground/architecture-guide': patch
'devground-init': patch
'@devground/commitlint-config': patch
'@devground/dev-metrics': patch
'@devground/devground': patch
'@devground/dreaming': patch
'@devground/eslint-config': patch
'@devground/husky-config': patch
'@devground/lint-staged-config': patch
'@devground/logger': patch
'@devground/prettier-config': patch
'@devground/python-config': patch
'@devground/rueditas': patch
'@devground/sdd': patch
'@devground/tsconfig': patch
'@devground/ui-conventions': patch
'@devground/vitest-config': patch
---

`engines.node` ahora es `>=22.22.1`. El mínimo real ya era ese, porque lint-staged 17 exige `>=22.22.1` (y commitlint 21 `>=22.12.0`); con Node 22.0 a 22.22.0 la instalación fallaba con ERESOLVE. Ahora lo declaramos para que el error sea claro. Además se actualizan dependencias (commander 15.1) y las de desarrollo para cerrar avisos de `pnpm audit`.
