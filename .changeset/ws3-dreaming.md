---
"@devground/dreaming": minor
---

devground-dreaming ahora reporta su versión real desde package.json (antes
mentía 0.0.0 mientras el paquete publicado es 0.1.1); el default de `--project`
en `gather` se deriva del directorio actual codificado como lo hace Claude Code
(antes apuntaba a la máquina del autor, `-Users-macbookpro`, e inutilizaba el
comando para terceros); y `loadState` degrada a un estado vacío ante un
`state.json` con `null`/forma inválida en vez de lanzar TypeError. Internamente,
`gather` stat-ea cada transcript una sola vez al ordenarlos por mtime.
