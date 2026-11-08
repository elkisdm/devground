---
'@devground/rueditas': minor
---

Las rueditas ya no son todo o nada. «Quita las rueditas» ofrece **seguir sin guía** (modo `libre`: sin etapas ni explicaciones, pero con las reglas que protegen: confirmar gastos e irreversibles, parar si un error se repite, mostrar las cosas funcionando y no saltarse los bloqueos del commit) o **quitar todo**. «Pon las rueditas» vuelve al modo guiado.

Desde la segunda vuelta, al cerrar una etapa sin conceptos nuevos, Claude propone seguir sin guía. Para eso el progreso registra `Modo`, `Vueltas completas` y la etapa de cada concepto.

Corrige el comando para volver a encenderlas: es `npx @devground/rueditas` (`npx devground-rueditas` daba 404 fuera de un proyecto que ya tuviera el paquete).

La skill se copia una sola vez y no se sobrescribe. Para recibir esta versión en un proyecto que ya la tiene, borra `.claude/skills/rueditas/` y corre `npx @devground/rueditas`: tu progreso en `.devground/rueditas.md` se conserva.
