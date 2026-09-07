---
"devground-init": patch
---

El estándar ya no se instala roto en proyectos de JavaScript puro. Dos fallas que solo aparecían sin TypeScript:

- `@vitest/coverage-v8` se pedía siempre en su última versión, así que un repo con vitest 3 terminaba con el provider v4 y `test:coverage` moría al arrancar (`does not provide an export named 'BaseCoverageProvider'`). Ahora se alinea al rango de vitest que el proyecto ya declara, y vitest no se vuelve a agregar si ya está.
- Los globs del `vitest.config.mjs` y del `lint-staged.config.cjs` apuntaban solo a `.ts`/`.tsx`: `vitest run` no encontraba un solo test y el pre-commit no linteaba ni formateaba nada. En proyectos sin TypeScript se escriben los globs `.js` (paquete único y monorepo).
