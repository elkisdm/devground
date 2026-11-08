---
'@devground/vitest-config': major
'devground-init': patch
---

El preset de Vitest ahora incluye `.tsx`: `test.include` pasa a `src/**/*.test.{ts,tsx}` y `coverage.include` a `src/**/*.{ts,tsx}`. Al actualizar, el porcentaje medido puede bajar (los componentes ahora cuentan) y romper el ratchet, y los tests `.test.tsx` que antes no corrían ahora corren con environment `node`. Para volver a los globs anteriores, sobreescribe `test.include` y `test.coverage.include` en tu config con `src/**/*.test.ts` y `src/**/*.ts`.

`devground-init` detecta al instalar las raíces de código del proyecto (`src`, `app`, `lib`, `components`, `packages/*/src`) y escribe los globs de test y cobertura con esas raíces (`{ts,tsx}` en TypeScript, `{js,jsx}` en JavaScript) en vez de mirar solo `src/`.
