---
'@devground/husky-config': patch
---

El instalador ya no sobrescribe la configuración existente: deja de correr `npx husky init`, que reemplazaba sin preguntar `scripts.prepare` y `.husky/pre-commit` antes de que se comprobara qué respetar. Ahora solo activa husky (`core.hooksPath`), agrega `prepare` si falta y escribe únicamente los hooks ausentes. En una segunda pasada no informa escrituras, así la CLI reporta `skipped`.
