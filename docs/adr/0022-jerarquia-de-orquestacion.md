# ADR-0022: Jerarquía de orquestación de agentes en sesiones interactivas

- **Estado**: Reemplazado por ADR-0027
- **Fecha**: 2026-07-10
- **Decisor**: edaza
- **Aplica a**: flujo de trabajo con agentes en Claude Code (spec-flow, model-orchestrator, subagentes)

> Ampliado y empaquetado en [ADR-0027](0027-empaquetar-regla-de-orquestacion.md).

## Contexto

Conviven dos mecanismos de orquestación que se parecen en la superficie y se pueden confundir:

1. **Sesión interactiva con modelo orquestador** (Fable/Opus): usa los hooks de Claude Code y
   subagentes especializados —un *planner* en Opus que produce el plan y un *ejecutor* en
   Sonnet que lo implementa—. Es el flujo por defecto del día a día.
2. **`model-orchestrator`** (`tools/`, ver [ADR-0017](0017-model-orchestrator-routing.md)): un
   harness que reparte una lista de tareas heterogéneas a Opus/Sonnet/Haiku por complejidad,
   con piso declarativo, clamp determinístico y costo estimado.

Sin una regla explícita de cuándo usar cuál, se corre el riesgo de invocar el orquestador de
modelos en cada sesión —overhead de planificación y costo sin beneficio en cambios de una sola
tarea, y presión de RAM por levantar múltiples subagentes por sesión— o, al revés, de no usarlo
cuando de verdad paga: descomposiciones grandes en muchas tareas independientes.

## Decisión

En sesiones interactivas, el flujo por defecto es **hooks de Claude Code + subagentes
planner (Opus) / ejecutor (Sonnet)**. `model-orchestrator` **no** se usa en cada sesión.

`model-orchestrator` queda **reservado para el Step 3.5 de spec-flow**: cambios Tier 2-3 con
múltiples tareas independientes que emiten un `tasks.json`, donde el ruteo por complejidad
ahorra de verdad. No se archiva: se mantiene sincronizado (copia en `tools/`, fuente en
`~/.claude/skills/model-orchestrator/`) y su dominio queda acotado a ese punto de entrada.

## Consecuencias

**Positivas**
- Cada mecanismo tiene un dominio claro; se evita overhead y RAM en sesiones normales.
- model-orchestrator sigue disponible exactamente donde su ruteo por complejidad paga.

**Negativas / Trade-offs**
- Dos caminos coexisten: hay que conocer la regla para elegir bien.
- model-orchestrator queda como herramienta de nicho hasta que se estabilice el volumen de
  cambios Tier 2-3 orquestados que lo justifiquen.

## Alternativas consideradas

1. **Archivar model-orchestrator**: descartada. Perdería el ruteo por complejidad en las
   descomposiciones grandes, que es justo donde ahorra; ADR-0017 documenta ese valor.
2. **Usar model-orchestrator en toda sesión**: descartada. Overhead de planificación y costo
   por sesión, más riesgo de RAM al levantar workflows multi-agente, sin beneficio en cambios
   de una sola tarea.

## Referencias

- [ADR-0017 — Routing de modelos por complejidad](0017-model-orchestrator-routing.md)
- spec-flow, Step 3.5 (emisión de `tasks.json`) — `packages/sdd/skill/SKILL.md`
- Telemetría de cambios: `.spec-flow/events.jsonl`
