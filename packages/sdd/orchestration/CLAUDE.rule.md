# Regla de orquestación (extractos para la sección `## Rules` de CLAUDE.md)

Son **dos bullets con alcance distinto**. Pega el base siempre; el add-on solo si activaste
los hooks de esta capa a propósito (ver [ADR-0028](../../../docs/adr/0028-orquestacion-opt-in-desactivada-por-defecto.md)
y [ADR-0030](../../../docs/adr/0030-delegacion-opt-in-por-peticion.md)).

## Base — para todos, con o sin esta capa

Va en tu `~/.claude/CLAUDE.md` (global) o en el `CLAUDE.md` del proyecto:

- Toda petición de cambio de desarrollo (feature, fix, refactor, perf, mejora) pasa primero por `spec-flow`: clasificar → asignar tier → producir el brief con archivos/rutas a tocar, ANTES de escribir código. Excepción: Tier 0 (typo, chore trivial) no lleva ceremonia. El tier gradúa la ceremonia de la spec, NO rutea agentes: la ejecución es tuya en el main loop, con cualquier modelo de sesión. Los subagentes `planner`, `planner-deep` y `ejecutor` son OPT-IN — los lanzas solo si el usuario lo pide, o si lo propones y el usuario acepta (proponlo ante Tier 3 o riesgo alto: migraciones, cambios irreversibles, contratos externos, seguridad). Esto es a nivel de PETICIÓN, no por línea.

## Add-on — solo si instalaste los hooks de esta capa

Reemplaza la parte de ejecución del bullet base. No lo pegues si no registraste
`orchestrator-gate.sh` y `orchestrator-context.sh` en `settings.json`: sin los hooks es una
orden sin respaldo, y con Opus/Fable como modelo de sesión delegará en cada petición.

- Con la capa de orquestación activa y Fable/Mythos/Opus como modelo de sesión, la EJECUCIÓN es de subagentes: Tier 0-1 van directo a `ejecutor` sin planner (Tier 1 con brief autocontenido del orquestador: rutas exactas + fragmentos relevantes inline); Tier 2 usa `planner` (Opus high); Tier 3 o riesgo alto usa `planner-deep` (Opus xhigh); en sesiones Sonnet/Haiku procede directo.

Tier 0-1 sigue delegando porque `orchestrator-gate.sh` deniega `Edit`/`Write` en el main
loop sin mirar el tier — es el defecto #3 de ADR-0028, abierto: sacarlos de la delegación
exige cambiar el script, no este texto.

## Ruteo de modelo — base, para todos

Va junto al bullet base. Es **condicional**: aplica solo cuando ya se decidió delegar, así que
no puede provocar delegaciones (ver [ADR-0031](../../../docs/adr/0031-modelo-explicito-al-delegar.md)).

- Cuando SÍ delegues (porque el usuario lo pidió o lo aceptó), la llamada lleva `model` EXPLÍCITO según la naturaleza de la tarea: búsqueda/lectura/exploración → `sonnet`; trabajo mecánico determinista (rename, mover, bump, formato, docs) → `haiku`; implementación de lógica → `sonnet`; juicio (plan, diseño, auditoría, decisión, security review) → `opus`. Sin `model` explícito el subagente HEREDA el modelo del padre. Los agentes que ya declaran `model` en su frontmatter (`ejecutor` sonnet, `planner` opus) NO se tocan: su definición gana. Si hay un brief con varias tareas y quieres repartirlas por costo/calidad, la skill `model-orchestrator` lo hace con política de piso — pero es opt-in, la pide el usuario.

Por qué importa: los agentes built-in del harness (`Explore`, `general-purpose`, `claude`) no
tienen definición en disco donde fijar el modelo, así que heredan el del padre. Con Opus como
modelo de sesión habitual, eso fueron 353 lanzamientos de búsqueda en Opus en julio 2026 —
~59% de los lanzamientos Opus del mes.
