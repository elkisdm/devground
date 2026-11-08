# ADR-0045: Toolchain 2026: Node 22+ y versiones mayores al día

- **Estado**: Aceptado
- **Fecha**: 2026-11-05
- **Decisor**: edaza
- **Aplica a**: el monorepo y todos los paquetes publicados
- **Termina**: la regla de Dependabot que ignoraba versiones mayores durante la consolidación ([ADR-0026](0026-fase-de-consolidacion-nucleo-soportado.md), cerrada por [ADR-0033](0033-salida-de-consolidacion.md))

## Contexto

La revisión del 2026-11-05 encontró el toolchain detenido en la fase de consolidación:

- `.nvmrc` en 20 y `engines: >=20`, aunque Node 20 salió de soporte en abril de 2026; CI
  probaba en 20 y 22.
- Dependabot ignoraba todas las versiones mayores «durante la fase de consolidación», que
  cerró el 2026-09-07. Resultado: Vitest 2 (la última es 5), commitlint 19 (21), lint-staged
  15 (17) y TypeScript 5.9.
- El repo usaba lint-staged 15 mientras `@devground/devground` exigía `>=16` a sus
  consumidores: el estándar publicado no se probaba en casa.
- CI no revisaba la seguridad de las dependencias.

## Decisión

**El mínimo soportado es Node 22.22.1 (lint-staged 17 lo exige); CI prueba 22 y 24; las versiones mayores entran por
Dependabot agrupadas y se migran en vez de ignorarse.**

1. `.nvmrc` = 24, `engines.node` = `>=22.22.1` en la raíz y en todos los paquetes publicados.
   Matriz de CI [22, 24]; el release publica con Node 24. Vitest 5 pide Node `^22.12`: es el
   piso efectivo para quien use `@devground/vitest-config`.
2. Dependabot ya no ignora mayores: las agrupa (`*-major`) para que lleguen en un PR por
   grupo. Se mantiene la excepción de `changesets/action`, con su motivo propio.
3. Versiones al 2026-11-05: Vitest y `@vitest/coverage-v8` 5.1, commitlint 21, lint-staged 17,
   TypeScript 6.0. Los peers mínimos de los presets son lo que se prueba (`vitest >=5`,
   `commitlint >=21`, `lint-staged >=17`).
4. **TypeScript 7 queda fuera**: es el compilador nativo (otro binario y otra API) y se
   evalúa como cambio aparte. Con TS 6, `@types/node` ya no entra solo: los paquetes que lo
   usan declaran `"types": ["node"]`.
5. `@devground/tsconfig` sube el `target` base de ES2017 a ES2022.
6. CI corre `pnpm audit --audit-level=high` sin bloquear mientras se limpian los hallazgos
   heredados (al 2026-11-05: 1 crítico en `astro`, que solo entra como dependencia de
   desarrollo de `@devground/tsconfig`, y 38 altos en dependencias transitivas). Pasa a
   bloquear cuando el conteo de altos y críticos llegue a cero.
7. **Recalibración del ratchet del CLI.** Vitest 5 mide la cobertura v8 de otra forma: sin
   cambiar código, las ramas del CLI pasaron de 95,21 % a 87,31 %. El piso se fijó en los
   valores nuevos. Es la única excepción a «la cobertura nunca baja» (ADR-0025) y solo vale
   cuando cambia el método de medición, no el código.

Todo cambio de mínimo de Node o de peer mayor se publica como versión mayor (changesets).

## Consecuencias

**Positivas**

- El estándar corre en versiones con soporte y se prueba con lo mismo que exige.
- Las mayores llegan agrupadas y a tiempo, en vez de acumularse en saltos de tres versiones.

**Negativas / Trade-offs**

- Quince paquetes publican una versión mayor a la vez. Mitigación: el changeset explica que
  basta con quedarse en la versión anterior si se sigue en Node 20.
- El paso de auditoría no bloquea todavía. Mitigación: la regla dice cuándo pasa a bloquear.

## Alternativas consideradas

1. **Mantener `>=20`**: soportar un Node sin parches de seguridad no es un estándar.
2. **Subir a TypeScript 7 en el mismo cambio**: mezcla una migración de compilador con la de
   herramientas y hace imposible aislar una falla.

## Referencias

- [ADR-0025](0025-coverage-ratchet.md), [ADR-0026](0026-fase-de-consolidacion-nucleo-soportado.md), [ADR-0033](0033-salida-de-consolidacion.md)
- Calendario de Node.js: https://nodejs.org/en/about/previous-releases
