---
'@devground/rueditas': minor
'devground-init': patch
---

Al reinstalar, si la skill que ya tienes no coincide con la del paquete (una versión anterior o cambios tuyos), el instalador lo avisa, dice qué archivos difieren y cómo actualizar: borrar `.claude/skills/rueditas/` y correr `npx @devground/rueditas`. Tu progreso en `.devground/rueditas.md` se conserva. No se sobrescribe nada sin que lo decidas. `devground-init` repite el aviso en vez de solo marcarla como omitida.
