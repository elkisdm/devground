# @devground/dreaming

## 0.2.1

### Patch Changes

- 8a1907e: Cierra el ciclo de 8 semanas del ADR-0026 con veredicto para los 11 experimentales (ADR-0032).

  **Graduan** `@devground/logger` (lo consumen cli, dev-metrics y dreaming), `@devground/ui-conventions` (el installer del CLI ya lo instala en proyectos React/Next) y `@devground/deepcheck` (interno, sigue sin publicarse). Los dos primeros llegan con los tests que la graduacion exige: 7 casos para los niveles y las secuencias ANSI del logger, y 6 para el guard de copiado de ui-conventions — cuyo invariante ("nunca sobreescribe tu edicion local") no estaba cubierto y es la promesa central del paquete. Para poder testearlo, ese guard se extrajo de `setup.js` a `lib/copy-guarded.js`: el script corre su trabajo al importarse, asi que nada definido ahi era testeable.

  **Se congelan** chile-formats, dreaming, design-taste, model-orchestrator y los 4 `swift-*`: sin consumidores verificados. Congelar no borra ni despublica — el README de cada uno lo declara, `package.json` lo marca con `devground.status: "frozen"`, y basta con que un proyecto lo consuma para reactivarlo con un ADR nuevo.

  La superficie con mantenimiento activo baja de 23 a 15 paquetes.

- Updated dependencies [c8e9718]
- Updated dependencies [8a1907e]
  - @devground/dev-metrics@1.2.0
  - @devground/logger@0.3.0

## 0.2.0

### Minor Changes

- 8eec98a: devground-dreaming ahora reporta su versión real desde package.json (antes
  mentía 0.0.0 mientras el paquete publicado es 0.1.1); el default de `--project`
  en `gather` se deriva del directorio actual codificado como lo hace Claude Code
  (antes apuntaba a la máquina del autor, `-Users-macbookpro`, e inutilizaba el
  comando para terceros); y `loadState` degrada a un estado vacío ante un
  `state.json` con `null`/forma inválida en vez de lanzar TypeError. Internamente,
  `gather` stat-ea cada transcript una sola vez al ordenarlos por mtime.

### Patch Changes

- Updated dependencies [8e565ce]
  - @devground/dev-metrics@1.1.0

## 0.1.1

### Patch Changes

- Updated dependencies [78e990e]
- Updated dependencies [48dd01b]
  - @devground/dev-metrics@1.0.0

## 0.1.0

### Minor Changes

- 24aabb6: Add `@devground/dreaming`: out-of-band memory consolidation for Claude Code, installable
  via `devground-dreaming` (project-level `.claude/skills/`, or `--global`).

  It reviews a project's recent session transcripts against its memory store and proposes a
  reviewed diff — merge duplicates, deprecate stale/contradicted memories, add
  recurring-but-uncaptured patterns and feedback, and fix `MEMORY.md` index drift. A
  compiled TypeScript harness (`devground-dreaming gather`) does the token-free gather
  (window selection + transcript distillation + memory snapshot), reusing
  `@devground/dev-metrics`'s transcript reader and memory helpers; the skill reasons over
  the bundle and writes a proposal with evidence per change. Nothing is written to memory
  without approval; deprecate moves files to `.dream/archive/` and never hard-deletes.

### Patch Changes

- Updated dependencies [2fbbcef]
  - @devground/dev-metrics@0.4.0
