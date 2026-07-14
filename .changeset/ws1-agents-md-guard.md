---
"@devground/agents-md": minor
---

devground-agents ya nunca sobreescribe un AGENTS.md existente ni borra un
CLAUDE.md / .cursorrules / copilot-instructions.md / styleguide.md real del
usuario: los archivos preexistentes se respetan con aviso; solo se recrean
symlinks propios idempotentes. Corrige además el fallback de copia (Windows sin
symlinks) que resolvía la ruta contra el directorio PADRE del proyecto.
