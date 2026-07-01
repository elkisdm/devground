# ADR-0017: Routing de modelos por complejidad (model-orchestrator)

- **Estado**: Propuesto
- **Fecha**: 2026-06-30
- **Decisor**: edaza
- **Aplica a**: `tools/model-orchestrator/`

## Contexto

`spec-flow` produce un brief con una lista de tareas de tamaño y riesgo heterogéneos. Ejecutarlas todas con el modelo más capaz (Opus) es caro y desperdicia capacidad en tareas triviales; ejecutarlas todas con el más barato (Haiku) degrada la calidad en tareas de diseño, auditoría o lógica nueva. Hacía falta un mecanismo que asigne a cada tarea el modelo y el esfuerzo adecuados **antes** de despacharla, con un costo estimado honesto y aprobación explícita.

El riesgo de delegar esa decisión a un modelo es el clásico problema del zorro cuidando el gallinero: si el juicio "esta tarea puede bajar a Haiku" lo emite un modelo, no hay garantía de que respete las invariantes (un `feat` con lógica nueva no debería caer al modelo más barato). La decisión tenía que separar el **juicio** (barato, ajustable) de las **invariantes** (duras, no negociables).

## Decisión

Se crea `model-orchestrator` como harness en `tools/`, invocable en Claude Code **después** de `spec-flow`. Su pipeline:

1. **Piso declarativo** (`policy.json`): `kind`/`tier`/`risk` de la tarea → modelo + effort. Planes, auditorías, decisiones, ADRs, diseño y security-review anclan en `opus`/`max`; feat/fix medio en `sonnet`; docs/chore/rename en `haiku`/`low`.
2. **Ajuste ±1 nivel** por el agente `model-router` (juez barato que corre en Haiku): puede escalar o desescalar **como máximo un nivel de capacidad**, con justificación.
3. **CLAMP determinístico** en `engine.mjs` (Node puro, cero dependencias): impone las invariantes en código —un `feat` con lógica nueva nunca cae a Haiku; un piso `locked` no se desescala; el ajuste no excede ±1; el effort acompaña al escalar—. **Las invariantes NO se delegan al juicio del agente barato.**
4. **Costo estimado** (`pricing.json`): honesto por diseño —si un modelo no tiene tarifa verificada, el plan reporta ese costo como "pendiente", nunca inventado.
5. **Aprobación** explícita del plan + costo antes de ejecutar.
6. **Despacho** vía la herramienta Workflow (paralelo/secuencia según `depends_on`).
7. **Telemetría + reconciliación** de costo real vs estimado (`decisions.jsonl`).

`engine.mjs` es la fuente de verdad determinística y trae su propia suite (`selftest`, 30/30).

## Consecuencias

**Positivas**
- La decisión de routing es auditable y reproducible: el piso y el clamp son código, no juicio opaco.
- El juez barato aporta flexibilidad (±1 nivel) sin poder violar las reglas duras.
- El costo se presenta antes de gastar; sin tarifa verificada, se reporta "pendiente" en vez de un número falso.

**Negativas / límites**
- Dos artefactos a sincronizar: la copia versionada en `tools/model-orchestrator/` y la fuente activa en `~/.claude/skills/model-orchestrator/` + `~/.claude/agents/model-router.md`. Sincronización manual por ahora.
- `pricing.json` requiere mantenimiento con fecha: Sonnet 5 está en precio introductorio ($2/$10) hasta 2026-08-31 y sube a estándar ($3/$15) el 2026-09-01 — hay que actualizarlo entonces.
- Vive en `tools/`, no en `packages/`: no se publica como paquete ni entra al flujo de changesets.

## Alternativas consideradas

- **Un solo modelo para todo (descartada)**: Opus para todo es caro y desperdicia capacidad; Haiku para todo degrada tareas complejas. El objetivo es precio/calidad por tarea, no uniformidad.
- **Que el modelo decida el routing sin invariantes en código (descartada)**: sin un clamp determinístico, nada impide que el juez baje una tarea crítica al modelo barato. Las invariantes van en `engine.mjs`, no en el prompt.
- **Empaquetarlo como `@devground/*` (no ahora)**: es tooling de orquestación acoplado a Claude Code y a la telemetría de spec-flow; se mantiene en `tools/` hasta que estabilice. Se puede reconsiderar si se decide distribuirlo.
