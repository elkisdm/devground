---
"@devground/devground": major
"@devground/lint-staged-config": patch
---

devground-setup ahora delega toda la instalación en devground-init (implementación
única y testeada) en vez de reimplementarla. Corrige el bug crítico de lint-staged
(config como string en package.json) que bloqueaba todos los commits tras el
quickstart, deja de sobreescribir/borrar archivos del usuario (AGENTS.md, CLAUDE.md,
hooks), instala el hook commit-msg + gitleaks, ya no hardcodea pnpm e instala
eslint-config-next en proyectos Next. Ahora corre el preset completo respetando
"no sobreescribe archivos existentes". Requiere devground-init como dependencia.
El README de @devground/lint-staged-config deja de recomendar la forma string rota.
