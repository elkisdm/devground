# Regla de orquestación (extractos para la sección `## Rules` de CLAUDE.md)

Son **dos bullets con alcance distinto**. Pega el base siempre; el add-on solo si activaste
los hooks de esta capa a propósito (ver [ADR-0028](../../../docs/adr/0028-orquestacion-opt-in-desactivada-por-defecto.md)
y [ADR-0030](../../../docs/adr/0030-delegacion-opt-in-por-peticion.md)).

## Base — para todos, con o sin esta capa

Va en tu `~/.claude/CLAUDE.md` (global) o en el `CLAUDE.md` del proyecto:

- Toda petición de cambio de desarrollo (feature, fix, refactor, perf, mejora) pasa primero por `spec-flow`: clasificar → asignar tier → producir el brief con archivos/rutas a tocar, ANTES de escribir código. Excepción: Tier 0 (typo, chore trivial) no lleva ceremonia. En Tier 0–1 la ejecución es tuya en el main loop. En Tier 2–3 el brief lleva un plan de ejecución (`### Ejecución`): cada tarea va a `ejecutor-mecanico` (haiku·low), `ejecutor` (sonnet·medium) o `ejecutor-critico` (opus·high) según su naturaleza, máximo 5 agentes por cambio, y tú orquestas e integras sin implementar en el main loop (ADR-0040). La asignación la manda la definición de cada agente (ADR-0044). `planner`/`planner-deep` y los agentes de review siguen siendo OPT-IN.

## Add-on — solo si instalaste los hooks de esta capa

Reemplaza la parte de ejecución del bullet base. No lo pegues si no registraste
`orchestrator-gate.sh` y `orchestrator-context.sh` en `settings.json`: sin los hooks es una
orden sin respaldo, y con Opus/Fable como modelo de sesión delegará en cada petición.

- Con la capa de orquestación activa y Fable/Mythos/Opus como modelo de sesión, también Tier 0–1 se delegan a `ejecutor` (con brief autocontenido: rutas exactas + fragmentos relevantes inline), porque el gate no deja editar en el main loop. Tier 2–3 siguen el plan de ejecución del bullet base (ADR-0040). `planner`/`planner-deep` siguen siendo opt-in. En sesiones Sonnet/Haiku procede directo.

Tier 0-1 sigue delegando porque `orchestrator-gate.sh` deniega `Edit`/`Write` en el main
loop sin mirar el tier — es el defecto #3 de ADR-0028, abierto: sacarlos de la delegación
exige cambiar el script, no este texto.

## Ruteo de modelo — base, para todos

Va junto al bullet base. Es **condicional**: aplica solo cuando ya se decidió delegar, así que
no puede provocar delegaciones (ver [ADR-0031](../../../docs/adr/0031-modelo-explicito-al-delegar.md)).

- Cuando SÍ delegues (porque el usuario lo pidió o lo aceptó), la llamada lleva `model` EXPLÍCITO según la naturaleza de la tarea: búsqueda/lectura/exploración → `sonnet`; trabajo mecánico determinista (rename, mover, bump, formato, docs) → `haiku`; implementación de lógica → `sonnet`; juicio (plan, diseño, auditoría, decisión, security review) → `opus`. Sin `model` explícito el subagente HEREDA el modelo del padre. Los agentes que ya declaran `model` en su frontmatter (los tres `ejecutor*`, `planner`, `planner-deep`) NO se tocan: su definición gana (ADR-0044). Si hay un brief con varias tareas y quieres repartirlas por costo/calidad, la skill `model-orchestrator` lo hace con política de piso — pero es opt-in, la pide el usuario.

Por qué importa: los agentes built-in del harness (`Explore`, `general-purpose`, `claude`) no
tienen definición en disco donde fijar el modelo, así que heredan el del padre. Con Opus como
modelo de sesión habitual, eso fueron 353 lanzamientos de búsqueda en Opus en julio 2026 —
~59% de los lanzamientos Opus del mes.
