---
"devground-init": minor
---

devground-init ahora reporta honestamente en los resúmenes: los instaladores
que delegan en un bin (husky, agents-md, architecture-guide, ui-conventions)
cuentan como "skipped" cuando el bin no escribió nada en un re-run, en vez de
inflar el tally. El instalador de Vitest ya no agrega el script `test:coverage`
cuando encuentra un `vitest.config.mjs` propio sin provisionar
`@vitest/coverage-v8` (evita un script que reventaba en runtime); en ese caso
agrega solo `test`. En un directorio sin package.json (p. ej. un repo Swift-only)
el CLI sale limpio con un mensaje claro en vez de correr instaladores JS que
fallaban con ENOENT. Internamente: las dependencias de dev se instalan en UNA
sola invocación del package manager (antes hasta 8 seriales), se removió la
detección de stack Swift muerta, y la lógica de exit codes es ahora una función
pura testeada.
