# Plugin de Claude Code

Las skills curadas de devground instalables con dos comandos, sin `npx` por proyecto:

```
/plugin marketplace add elkisdm/devground
/plugin install devground@devground
```

Trae **3 skills** (namespaceadas como `devground:<skill>`):

| Skill | Qué hace |
|-------|----------|
| `cimientos` | Entrevista guiada de decisiones de arquitectura para proyectos greenfield; escribe ADRs (status Propuesto) + `DECISIONS.md` |
| `spec-flow` | Convierte una petición vaga en una spec right-sized y la rutea al proceso mínimo que merece (el skill de `@devground/sdd`) |
| `escritura-tecnica` | Checklists mecánicos para prosa técnica que se acepta: ADRs, READMEs, PR bodies, guías |

## ¿Plugin o npx? (elige por lo que instalas)

El plugin y los instaladores npm **no compiten: distribuyen cosas distintas.**

| Quieres | Usa | Por qué |
|---------|-----|---------|
| Skills en TODOS tus proyectos, actualizables con un comando | **Plugin** | Se instala a nivel usuario; `/plugin update` actualiza; cero archivos en tus repos |
| Skills committeadas EN un repo (el equipo las hereda al clonar) | `npx @devground/sdd`, etc. | El plugin es local a tu máquina; lo que va en el repo se instala con npx |
| Configs (ESLint, Prettier, tsconfig, commitlint…) | **npm siempre** | Son dependencias versionadas con semver — esa es la ventaja arquitectónica de devground y el plugin no la toca |
| Hooks del harness (typecheck/prettier al editar) | `npx devground-hooks` **siempre** | Deliberadamente FUERA del plugin: un plugin auto-carga sus hooks para todo el que lo instala, y con `devground-hooks` ya instalado correrían dos veces por edición. Los hooks son opt-in por proyecto (un test lo hace permanente) |

**Convivencia plugin + npx:** instalar ambos no rompe nada — Claude Code namespacea las
skills del plugin (`devground:cimientos` vs `cimientos` del proyecto), así que coexisten.
La redundancia es inocua pero innecesaria: para un mismo scope elige un canal.

## Cómo está construido

- La raíz del plugin es la raíz del repo: `.claude-plugin/plugin.json` (manifest) +
  `.claude-plugin/marketplace.json` (marketplace auto-hosteado) + `skills/`.
- `skills/` son **symlinks** a las fuentes reales (`.claude/skills/*`,
  `packages/sdd/skill`) — cero duplicación; Claude Code los preserva y resuelve en su
  caché de plugins (verificado con una instalación real).
- El set de skills es deliberado y está **cerrado por test**
  (`packages/agents-md/tests/claude-plugin.test.mjs`): una skill interna del repo no
  puede colarse al plugin sin romper CI. `dreaming` y `deepcheck` quedan fuera mientras
  sigan en piloto privado.
- Validación de manifest: `claude plugin validate .`

## Límites conocidos

- **Windows:** los symlinks de `skills/` requieren un git con symlinks habilitados;
  sin eso el checkout produce archivos de texto y las skills no cargan.
- **`cimientos` degrada sin knowledge base:** razona mejor con `knowledge/adr/`
  (`@devground/architecture-guide`) presente en el proyecto; sin ella sigue funcionando
  con sus heurísticas propias.
- La instalación cachea el repo completo del marketplace; es el costo del modelo
  "la raíz del repo es el plugin" (mismo trade-off que asume ECC).
