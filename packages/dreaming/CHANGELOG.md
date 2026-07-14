# @devground/dreaming

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
