# @devground/logger

## 0.3.0

### Minor Changes

- 8a1907e: Cierra el ciclo de 8 semanas del ADR-0026 con veredicto para los 11 experimentales (ADR-0032).

  **Graduan** `@devground/logger` (lo consumen cli, dev-metrics y dreaming), `@devground/ui-conventions` (el installer del CLI ya lo instala en proyectos React/Next) y `@devground/deepcheck` (interno, sigue sin publicarse). Los dos primeros llegan con los tests que la graduacion exige: 7 casos para los niveles y las secuencias ANSI del logger, y 6 para el guard de copiado de ui-conventions — cuyo invariante ("nunca sobreescribe tu edicion local") no estaba cubierto y es la promesa central del paquete. Para poder testearlo, ese guard se extrajo de `setup.js` a `lib/copy-guarded.js`: el script corre su trabajo al importarse, asi que nada definido ahi era testeable.

  **Se congelan** chile-formats, dreaming, design-taste, model-orchestrator y los 4 `swift-*`: sin consumidores verificados. Congelar no borra ni despublica — el README de cada uno lo declara, `package.json` lo marca con `devground.status: "frozen"`, y basta con que un proyecto lo consuma para reactivarlo con un ADR nuevo.

  La superficie con mantenimiento activo baja de 23 a 15 paquetes.

## 0.2.0

### Minor Changes

- 38a68ec: Two new shared packages extracted from the existing toolkit:

  - `@devground/logger` — tiny, dependency-free console logger with ANSI-colored
    levels (`header`, `log`, `info`, `success`, `warn`, `error`). Replaces the two
    near-identical local loggers that lived in `devground-init` and
    `@devground/dev-metrics`; both now consume this package via `workspace:*`.
  - `@devground/vitest-config` — shared Vitest configuration (node environment,
    no globals, `src/**/*.test.ts` include, and a v8 coverage profile that
    excludes build output, declarations and configs). Coverage is opt-in: the v8
    provider only loads with `--coverage`. `devground-init` and
    `@devground/dev-metrics` now extend it from their `vitest.config.mts`.
