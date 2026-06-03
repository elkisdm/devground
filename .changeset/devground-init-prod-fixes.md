---
'devground-init': patch
---

Arregla bugs que rompían la promesa de uso del CLI (hallados y re-verificados auditando el flujo con @devground/deepcheck):

- **No sobreescribe tus configs.** Los instaladores de archivo de config (ESLint, Commitlint, TypeScript, lint-staged) ahora respetan un archivo preexistente: lo dejan intacto **y no instalan dependencias**, en vez de truncar tu config mientras dicen haberla respetado. Prettier respeta una clave `"prettier"` previa.
- **lint-staged queda realmente configurado.** Antes escribía `"lint-staged": "@devground/lint-staged-config"` (un string) en package.json, que lint-staged rechaza en runtime. Ahora escribe `lint-staged.config.cjs` que re-exporta el config compartido.
- **El código de salida refleja los fallos.** Si algún instalador falla, el CLI reporta el conteo real y sale con código distinto de 0 (antes siempre salía 0, ocultando fallos en CI).
- **`--version` reporta la versión real** leída del package.json, no un literal hardcodeado.
- **`--preset` inválido falla con un error claro** (`exit 1`) en vez de caer en silencio al prompt interactivo.
- **Entornos no interactivos (CI / stdin sin TTY)** ahora exigen `--yes` o `--preset` y fallan con mensaje claro, en vez de salir con éxito habiendo instalado cero herramientas.
- **Los errores de lectura de package.json** se reportan con su causa real (parse/permisos) en vez de culpar siempre a un manifest ausente.
- **Docs sincronizadas** con el comportamiento real (tabla del CLI incluye Architecture guide; el inventario lista `lint-staged.config.cjs`).
