---
"devground-init": minor
---

Nuevo subcomando `devground-init machine`: instala el estandar UNA VEZ para toda la maquina en vez de repo por repo (ADR-0034).

El modelo por proyecto no alcanzaba los repos existentes — adoptar el estandar en uno exige tocar su package.json, su lockfile y su CI, y eso compite con el trabajo real y pierde. Medido: 30 de 42 repos sin el estandar, y 7 de los 8 mas caros sin ningun gate de commits.

Instala despachadores de hooks en `~/.config/devground/hooks` y apunta ahi el `core.hooksPath` global. Tres decisiones de diseno que lo hacen seguro:

- **Opt-in por repo**: actua solo si el repo cuelga de una raiz configurada (`~/Developer` por defecto) o tiene un archivo `.devground`. Un `.devground-ignore` lo excluye y gana sobre todo lo demas. Los repos de terceros que clones quedan intactos.
- **Encadena al hook local**: fijar `core.hooksPath` hace que git deje de leer `.git/hooks/` por completo. Se instalan despachadores incluso para eventos donde devground no agrega nada, para que lo que ya vivia ahi siga corriendo.
- **Impone solo lo que no depende del ecosistema**: gitleaks y validacion de Conventional Commits en shell puro (la razon de ser del hook: los repos que mas lo necesitan no pueden instalar commitlint). El lint y el formato se DELEGAN a las herramientas del proyecto con `--no-install`, nunca a una version global que formatearia distinto que el CI.

Se niega a pisar un `core.hooksPath` de otra herramienta. Rollback en una linea: `git config --global --unset core.hooksPath`.
