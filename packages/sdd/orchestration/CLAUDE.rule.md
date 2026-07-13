# Regla de orquestación (párrafo para la sección `## Rules` de CLAUDE.md)

Pega este bullet en tu `~/.claude/CLAUDE.md` (global) o en el `CLAUDE.md` del proyecto:

- Toda petición de cambio de desarrollo (feature, fix, refactor, perf, mejora) pasa primero por `spec-flow`: clasificar → asignar tier → producir el brief con archivos/rutas a tocar, ANTES de escribir código. Excepción: Tier 0 (typo, chore trivial) no lleva ceremonia; en sesiones orquestadoras (Fable/Opus como modelo de sesión) la EJECUCIÓN siempre es de subagentes — Tier 0-1 van directo a `ejecutor` sin planner (Tier 1 con brief autocontenido del orquestador: rutas exactas + fragmentos relevantes inline); Tier 2 usa `planner` (Opus high); Tier 3 o riesgo alto usa `planner-deep` (Opus xhigh); en sesiones Sonnet/Haiku procede directo. Esto es a nivel de PETICIÓN, no por línea.
