# ADR-0016: spec-flow se distribuye como `@devground/sdd`

- **Estado**: Aceptado
- **Fecha**: 2026-06-17
- **Decisor**: edaza
- **Aplica a**: `packages/sdd/`

## Contexto

`spec-flow` (la skill de intake SDD) vivía suelta en `~/.claude/skills/spec-flow/`, validada en uso real (179 cambios, 16 repos). El plan siempre fue empaquetarla en el monorepo devground para versionarla y distribuirla como el resto de los estándares (`@devground/eslint-config`, `architecture-guide`, `deepcheck`).

## Decisión

Se crea `@devground/sdd`: un paquete **solo-skill** con un instalador `devground-sdd` (`setup.js`, CommonJS) que copia `skill/` (SKILL.md + references) a un directorio de skills de Claude Code.

- **Destino**: por defecto `<cwd>/.claude/skills/spec-flow/` (nivel proyecto, igual que `@devground/deepcheck`); con `--global`, `~/.claude/skills/spec-flow/`.
- **No sobreescribe**: archivos existentes se respetan (guard `copyDirGuarded`), preservando ediciones locales; re-correr agrega solo lo que falte.
- **Separación de responsabilidades**: el paquete trae la skill; la MEDICIÓN de su impacto (test-coupling, supervivencia, costo de orientación, fricción) vive en `@devground/dev-metrics` (`spec-flow-impact`, `orientation`), que lee la telemetría `.spec-flow/events.jsonl`. No se mezclan.

## Consecuencias

**Positivas**
- spec-flow queda versionada, instalable y actualizable como cualquier estándar devground.
- La mejora del Step 0 (leer el codemap es obligatorio) viaja con el paquete.

**Negativas / límites**
- Dos artefactos a mantener sincronizados: la copia en `packages/sdd/skill/` y la skill viva en `~/.claude/skills/spec-flow/`. Mitigado con el script `packages/sdd/scripts/sync-spec-flow.mjs` (`pnpm --filter @devground/sdd sync`), que regenera `skill/` desde la fuente canónica copiando `SKILL.md` + `references/`. NO se ata a `prepublishOnly` a propósito: la fuente vive fuera del repo (`~/.claude`), así que el mirror commiteado es lo que se publica y la sincronización es un acto deliberado, no un paso de release.
- Instalar a nivel proyecto duplica la skill por repo. Es el costo de que cada proyecto declare explícitamente su tooling; `--global` queda para quien prefiera una sola copia.

## Alternativas consideradas

- **Bundle con dev-metrics (descartada)**: mezcla la skill (intake) con la medición; viola separación de responsabilidades y obliga a quien solo quiere la skill a traerse el analizador.
- **Solo global (descartada como default)**: el resto de paquetes devground instalan a nivel proyecto; se mantiene la convención y se ofrece `--global` como opción.
