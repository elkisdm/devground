---
"devground-init": patch
---

El config de commitlint se escribe como `commitlint.config.cjs`. Exportaba con `module.exports` dentro de un `.js`, así que en cualquier proyecto con `"type": "module"` el hook `commit-msg` moría al cargarlo. Un `commitlint.config.js` que ya exista se sigue respetando, igual que antes.
