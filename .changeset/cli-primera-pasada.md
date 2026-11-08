---
'devground-init': patch
---

`devground-init` funciona a la primera en un proyecto nuevo: los instaladores que delegan en otro paquete (husky, AGENTS.md, guía de arquitectura, ui-conventions y rueditas) ahora llaman a `npx --yes --package=<paquete> <bin>`, así que ya no fallan cuando el paquete todavía no está en `node_modules`. Antes había que correrlo dos veces.
